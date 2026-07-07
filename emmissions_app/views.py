# emmissions_app/views.py
import os
import logging
import io
import re
import requests
import base64
import json
from groq import Groq
from pypdf import PdfReader
from pyzbar.pyzbar import decode
from PIL import Image


from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import Throttled

# Import local modules cleanly
from .models import UserProfile, ActivityLog, SystemComplaint, PaymentLog
from .permissions import IsOwner, IsHighestPaidTier, PremiumTierPermission
from .utils import generate_mpesa_credentials, get_mpesa_callback_url

logger = logging.getLogger(__name__)

# Import the updated serializers repository map
from .serializers import (
    SystemComplaintSerializer, 
    CustomTokenObtainPairSerializer, 
    CustomRegisterSerializer
)
        
class IsSystemAdmin(BasePermission):
    """
    Custom permission layer ensuring only staff accounts can read aggregated feedback data.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# Authentication Views (Login & Register Lifecycle)
class CustomLoginView(TokenObtainPairView):
    """
    The Login Endpoint. 
    Requires ONLY username and personal password.
    """
    serializer_class = CustomTokenObtainPairSerializer


class CustomRegisterView(APIView):
    """
    Registration Engine managed natively by CustomRegisterSerializer constraints.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        # Open transaction isolate to prevent database pollution
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            
            # If a registration secret is present, it's already cleared as valid by the serializer
            if validated_data.get('signup_secret'):
                user.is_staff = True
                user.save()

            # Self-healing creation of core profile attributes
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = validated_data.get('phone_number')
            profile.save()

        # Generate active JSON Web Token sequence block
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Account created successfully.",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "role": "ADMIN" if user.is_staff else "USER"
        }, status=status.HTTP_201_CREATED)


class PremiumAIActionView(APIView):
    permission_classes = [PremiumTierPermission]

    def post(self, request):
        task_type = request.data.get("task")
        groq_key = os.getenv("GROQ_API_KEY")

        if not groq_key:
            return Response({"error": "AI Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if task_type == "route":
            origin = request.data.get("origin")
            destination = request.data.get("destination")
            vehicle_type = request.data.get("vehicle_type")  
            vehicle_make = request.data.get("vehicle_make")  

            if not origin or not destination:
                return Response({"error": "Origin and destination fields are required."}, status=status.HTTP_400_BAD_REQUEST)
                          
            system_guidance = (
                "You are a strict, analytical transit emission calculation engine.\n"
                "Your core task is to calculate realistic routing distances and carbon metrics based on the input metrics.\n"
                "MATHEMATICAL COMPUTATION REQUIREMENT:\n"
                "- Step 1: Compute realistic road distances for each milestone segment.\n"
                "- Step 2: Sum the segment distances to get the exact value for 'estimated_distance_km'.\n"
                "- Step 3: Compute carbon emissions for this specific vehicle profile (baseline SUV emissions are high; a Range Rover Velar averages 0.18-0.24 kg CO2 per km).\n"
                "- Step 4: Calculate 'total_carbon_saved_kg' by subtracting your optimized multi-modal route emissions from a worst-case baseline trip (e.g., a standard un-optimized high-congestion ICE route which would emit far more due to severe idling)."
            )

            user_context = (
                f"Calculate a route from origin: '{origin}' to destination: '{destination}' "
                f"using vehicle profile: {vehicle_make} ({vehicle_type}).\n\n"
                f"Provide your final calculation strictly in JSON format. Do not use placeholders from the schema below. "
                f"Replace every single numeric value with your live computed calculation results.\n\n"
                f"REQUIRED JSON FORMAT SCHEMA STRUCTURE:\n"
                f"{{\n"
                f"  \"estimated_distance_km\": <calculated_float_sum_of_milestones>,\n"
                f"  \"total_carbon_saved_kg\": <calculated_float_savings>,\n"
                f"  \"milestones\": [\n"
                f"    {{\n"
                f"      \"mode\": \"string\",\n"
                f"      \"instruction\": \"string\",\n"
                f"      \"distance_km\": <calculated_segment_float>,\n"
                f"      \"emissions_kg\": <calculated_segment_float>\n"
                f"    }}\n"
                f"  ],\n"
                f"  \"narrative\": \"string\"\n"
                f"}}\n"
                f"Return ONLY the valid raw JSON object. Do not wrap the output in markdown backticks or triple-tick blocks."
            )

            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {groq_key}", 
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": "llama-3.1-8b-instant", 
                    "messages": [
                        {"role": "system", "content": system_guidance},
                        {"role": "user", "content": user_context}
                    ],
                    "temperature": 0.3
                }
                
                groq_response = requests.post(url, json=payload, headers=headers, timeout=10)
                response_json = groq_response.json()
                
                if "error" in response_json:
                    return Response({
                        "error": "Groq API rejected payload configuration.",
                        "details": response_json["error"]
                    }, status=status.HTTP_400_BAD_REQUEST)

                ai_text = response_json['choices'][0]['message']['content'].strip()
                
                if ai_text.startswith("```"):
                    ai_text = ai_text.strip("```").replace("json", "", 1).strip()
                
                clean_json_data = json.loads(ai_text)

                # Update the database quota tracking row
                profile = request.user.userprofile
                profile.ai_query_count += 1
                profile.save()

                # Extract values safely for log preservation
                total_distance = float(clean_json_data.get("estimated_distance_km", 0.0))
                
                # Dynamic Carbon Calculation logic
                net_emissions = float(clean_json_data.get("total_carbon_saved_kg", 0.0)) * -1.0 

                # Commit to unified database layout
                ActivityLog.objects.create(
                    user=request.user,
                    category="transportation",
                    activity_type=f"Route: {origin} to {destination}",
                    input_value=total_distance,
                    unit="km",
                    co2e_kg=net_emissions
                )

                return Response(clean_json_data, status=status.HTTP_200_OK)

            except json.JSONDecodeError:
                return Response({"error": "LLM returned invalid formatting that could not be parsed as clean JSON."}, status=status.HTTP_502_BAD_GATEWAY)
            except Exception as e:
                return Response({"error": f"AI Engine Handshake Failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

#  UPDATED ComplaintFunnelView with PATCH method for Admin
class ComplaintFunnelView(APIView):
    """
    Unified Complaint Management View
    Handles: GET (list), POST (create), PATCH (update status), 
    POST (respond), DELETE (remove)
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsSystemAdmin()]
        return [IsAuthenticated()]

    # GET: List all complaints or retrieve a specific complaint by id (Admin only)
    def get(self, request, complaint_id=None):
        if complaint_id is not None:
            try:
                complaint = SystemComplaint.objects.get(id=complaint_id)
            except SystemComplaint.DoesNotExist:
                return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)

            if not (request.user.is_staff or complaint.user == request.user):
                return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

            serializer = SystemComplaintSerializer(complaint)
            return Response(serializer.data, status=status.HTTP_200_OK)

        if not request.user.is_staff:
            return Response({"error": "Permission denied. Admin access required for full complaint listing."}, status=status.HTTP_403_FORBIDDEN)

        complaints = SystemComplaint.objects.all()
        serializer = SystemComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # POST: Create new complaint (Authenticated users)
    def post(self, request):
        # Check if this is a response submission
        if 'response' in request.data and request.user.is_staff:
            complaint_id = request.data.get('complaint_id')
            return self._handle_response(request, complaint_id)
        
        # Regular complaint submission
        serializer = SystemComplaintSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                {"message": "Complaint is received and processed. Expect feedback shortly!"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # PATCH: Update complaint status (Admin only)
    def patch(self, request, complaint_id):
        try:
            complaint = SystemComplaint.objects.get(id=complaint_id)
        except SystemComplaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only admins can update status
        if not request.user.is_staff:
            return Response({"error": "Permission denied. Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        new_status = request.data.get('status')
        if new_status not in ['pending', 'addressed', 'in_progress']:
            return Response({"error": "Invalid status. Must be 'pending', 'addressed', or 'in_progress'."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store old status for notification
        old_status = complaint.status
        complaint.status = new_status
        complaint.save()
        
        # Return full complaint data for frontend
        serializer = SystemComplaintSerializer(complaint)
        
        return Response({
            "message": f"Complaint status updated from '{old_status}' to '{new_status}'",
            "complaint": serializer.data
        }, status=status.HTTP_200_OK)
    
    # DELETE: Remove complaint (Admin only, only addressed complaints)
    def delete(self, request, complaint_id):
        try:
            complaint = SystemComplaint.objects.get(id=complaint_id)
        except SystemComplaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only admins can delete
        if not request.user.is_staff:
            return Response({"error": "Permission denied. Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow deletion of addressed complaints
        if complaint.status != 'addressed':
            return Response(
                {"error": "Only addressed complaints can be deleted. Current status: '{}'".format(complaint.status)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store complaint info for response
        complaint_info = {
            'id': complaint.id,
            'subject': complaint.subject,
            'username': complaint.user.username
        }
        
        complaint.delete()
        
        return Response({
            "message": f"Complaint #{complaint_info['id']} deleted successfully",
            "deleted_complaint": complaint_info
        }, status=status.HTTP_200_OK)
    
    # Helper: Handle response to complaint (Admin only)
    def _handle_response(self, request, complaint_id):
        try:
            complaint = SystemComplaint.objects.get(id=complaint_id)
        except SystemComplaint.DoesNotExist:
            return Response({"error": "Complaint not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only admins can respond
        if not request.user.is_staff:
            return Response({"error": "Permission denied. Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        response_text = request.data.get('response')
        if not response_text or not response_text.strip():
            return Response({"error": "Response text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store response
        complaint.response = response_text.strip()
        complaint.save()
        
        # Optionally auto-update status to 'addressed' when responding
        if complaint.status != 'addressed':
            old_status = complaint.status
            complaint.status = 'addressed'
            complaint.save()
            status_message = f" Status auto-updated from '{old_status}' to 'addressed'."
        else:
            status_message = ""
        
        return Response({
            "message": f"Response sent successfully to complaint #{complaint.id}.{status_message}",
            "complaint": {
                "id": complaint.id,
                "subject": complaint.subject,
                "status": complaint.status,
                "response": complaint.response,
                "username": complaint.user.username
            }
        }, status=status.HTTP_200_OK)
    
# COMPLETELY REWRITTEN MpesaCheckoutView with PaymentLog Integration
class MpesaCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        payload_phone = request.data.get('phone_number')
        
        # Determine payment type (default to subscription)
        payment_type = request.data.get('payment_type', 'subscription')
        amount = 5.00  # Default amount for subscription

        try:
            profile, created = UserProfile.objects.get_or_create(user=user)
            saved_phone = profile.phone_number
        except Exception as e:
            logger.error(f"UserProfile retrieval failed for user {user.username}: {str(e)}")
            return Response({"error": f"UserProfile retrieval failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        final_phone = payload_phone or saved_phone

        if not final_phone:
            return Response({
                "error": "M-Pesa payment requires a mobile phone asset.",
                "code": "PHONE_REQUIRED",
                "detail": "No phone number linked to your profile."
            }, status=status.HTTP_400_BAD_REQUEST)

        final_phone = str(final_phone).strip()
        if not final_phone.startswith('254') or len(final_phone) != 12:
            return Response(
                {"error": "Malformed payment phone format. Value must strictly match 2547XXXXXXXX format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not saved_phone:
            profile.phone_number = final_phone
            profile.save()

        try:
            token, password, timestamp = generate_mpesa_credentials()
            callback_url = get_mpesa_callback_url(request)
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            shortcode = str(os.environ.get('MPESA_EXPRESS_SHORTCODE', '174379')).strip()
            payload = {
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": str(int(amount)),
                "PartyA": final_phone,
                "PartyB": shortcode,
                "PhoneNumber": final_phone,
                "CallBackURL": callback_url,
                "AccountReference": f"Climatiqa-{user.username}",
                "TransactionDesc": "Premium Upgrade Subscription"
            }
            
            url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
            if os.environ.get('MPESA_ENVIRONMENT') == 'production':
                url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

            response = requests.post(url, json=payload, headers=headers, timeout=10)

            if response.status_code != 200:
                logger.error(f"M-Pesa gateway error for user {user.username}: {response.status_code}")
                return Response({
                    "error": "Safaricom gateway returned an unexpected status error.",
                    "status_code": response.status_code
                }, status=status.HTTP_400_BAD_REQUEST)
            
            response_data = response.json()
            
            if response_data.get("ResponseCode") == "0":
                checkout_id = response_data.get("CheckoutRequestID")
                
                # CREATE PAYMENT LOG - PENDING
                payment_log = PaymentLog.objects.create(
                    user=user,
                    payment_type='subscription',
                    amount=amount,
                    mpesa_checkout_id=checkout_id,
                    status='pending',
                    metadata={
                        'phone_number': final_phone,
                        'payment_initiated_from': request.META.get('HTTP_USER_AGENT', 'unknown'),
                        'ip_address': request.META.get('REMOTE_ADDR', 'unknown')
                    }
                )
                
                logger.info(f"PaymentLog created with ID {payment_log.id} for user {user.username}")
                
                # Bind transaction token to profile for webhook tracking
                profile.mpesa_checkout_request_id = checkout_id
                profile.save()

                # Log the initiation in ActivityLog
                ActivityLog.objects.create(
                    user=user,
                    category='payment',
                    activity_type='M-Pesa Payment Initiated',
                    input_value=amount,
                    unit='KES',
                    co2e_kg=0.0
                )

                return Response({
                    "message": "STK Push initiated. Verify on handset.",
                    "CheckoutRequestID": checkout_id,
                    "amount_billed": amount,
                    "payment_id": payment_log.id
                }, status=status.HTTP_200_OK)
            else:
                # Payment failed at M-Pesa gateway
                error_msg = response_data.get("ResponseDescription", "Gateway rejected request.")
                logger.error(f"M-Pesa STK push failed for user {user.username}: {error_msg}")
                
                # CREATE PAYMENT LOG - FAILED
                PaymentLog.objects.create(
                    user=user,
                    payment_type='subscription',
                    amount=amount,
                    mpesa_checkout_id='',
                    status='failed',
                    metadata={
                        'error': error_msg,
                        'response_code': response_data.get("ResponseCode")
                    }
                )
                
                return Response(
                    {"error": error_msg}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        except requests.exceptions.Timeout:
            logger.error(f"M-Pesa gateway timeout for user {user.username}")
            return Response({"error": "M-Pesa gateway timeout. Please try again."}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except requests.exceptions.ConnectionError:
            logger.error(f"M-Pesa connection error for user {user.username}")
            return Response({"error": "Network error connecting to M-Pesa. Please check your internet connection."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"M-Pesa checkout error for user {user.username}: {str(e)}")
            return Response({"error": f"Gateway connection failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# COMPLETELY REWRITTEN MpesaCarbonmarkCallbackView with PaymentLog Updates
class MpesaCarbonmarkCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        stk_callback = data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_desc = stk_callback.get("ResultDesc", "Unknown")
        
        # Safaricom expects a clean acknowledgment
        safaricom_success_ack = {
            "ResponseCode": "0",
            "ResponseDescription": "success"
        }

        logger.info(f"M-Pesa callback received for checkout ID: {checkout_request_id}, result: {result_code}")

        # FIND THE PAYMENT LOG BY CHECKOUT ID
        try:
            payment_log = PaymentLog.objects.get(mpesa_checkout_id=checkout_request_id)
        except PaymentLog.DoesNotExist:
            logger.warning(f"PaymentLog not found for checkout ID: {checkout_request_id}")
            return Response(safaricom_success_ack, status=status.HTTP_200_OK)

        # UPDATE PAYMENT LOG BASED ON RESULT
        result_code_normalized = str(result_code).strip()
        payment_log.metadata = payment_log.metadata or {}
        payment_log.metadata['result_code'] = result_code_normalized
        payment_log.metadata['result_desc'] = result_desc

        if result_code_normalized != '0':
            # Payment failed or was cancelled
            payment_log.status = 'failed'
            payment_log.completed_at = timezone.now()
            payment_log.metadata['error'] = result_desc
            payment_log.save()
            
            logger.warning(f"Payment failed for user {payment_log.user.username}: {result_desc}")
            return Response(safaricom_success_ack, status=status.HTTP_200_OK)

        # PAYMENT SUCCESSFUL - Update PaymentLog
        payment_log.status = 'completed'
        payment_log.completed_at = timezone.now()
        payment_log.save()
        
        logger.info(f"Payment successful for user {payment_log.user.username}")

        try:
            user = payment_log.user
            profile = user.userprofile

            # ACTIVATE PREMIUM SUBSCRIPTION
            profile.activate_premium_one_month()
            
            # Clear the checkout ID from profile
            profile.mpesa_checkout_request_id = None
            profile.save()
            
            # Log the successful payment in ActivityLog
            ActivityLog.objects.create(
                user=user,
                category='payment',
                activity_type='Premium Subscription Activated',
                input_value=float(payment_log.amount),
                unit='KES',
                co2e_kg=0.0
            )
            
            logger.info(f"Premium activated for user {user.username} until {profile.premium_expiry_date}")

        except Exception as e:
            logger.error(f"Error processing successful payment for user {payment_log.user.username}: {str(e)}")
            # Still return 200 to Safaricom even if our processing fails

        return Response(safaricom_success_ack, status=status.HTTP_200_OK)

class ProductScannerIngestionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        raw_text_content = ""

        # Step 1: Text extraction from files or payload
        if 'file' in request.FILES:
            pdf_file = request.FILES['file']
            try:
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    raw_text_content += page.extract_text() or ""
            except Exception as e:
                return Response({"error": f"PDF extraction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        # NEW: Handle QR image upload
        elif 'qr_image' in request.FILES:
            try:
                image_file = request.FILES['qr_image']
                image = Image.open(io.BytesIO(image_file.read()))
                decoded_objects = decode(image)
                
                if decoded_objects:
                    raw_text_content = decoded_objects[0].data.decode('utf-8')
                else:
                    return Response(
                        {"error": "No QR code found in image. Please ensure the image contains a clear QR code."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                return Response(
                    {"error": f"QR image processing failed: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            raw_text_content = request.data.get("qr_payload") or request.data.get("product_name")

        # Step 1: Text extraction from files or payload
        if 'file' in request.FILES:
            pdf_file = request.FILES['file']
            try:
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    raw_text_content += page.extract_text() or ""
            except Exception as e:
                return Response({"error": f"PDF extraction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            raw_text_content = request.data.get("qr_payload") or request.data.get("product_name")

        if not raw_text_content:
            return Response({"error": "No product metadata or file provided."}, status=status.HTTP_400_BAD_REQUEST)

        product_name = request.data.get("product_name")
        weight_kg = 1.0
        search_query = "materials"
        is_structured_qr = False

        # If the extracted QR payload is a pre-structured JSON string, parse it directly
        if isinstance(raw_text_content, str) and raw_text_content.strip().startswith("{"):
            try:
                structured_data = json.loads(raw_text_content)
                product_name = product_name or structured_data.get("product_name")
                weight_kg = float(structured_data.get("weight_kg", 1.0))
                search_query = structured_data.get("search_query") or product_name or "materials"
                is_structured_qr = True
            except (ValueError, TypeError, json.JSONDecodeError):
                pass
        
        estimated_co2 = 0.0
        estimated_override = request.data.get("estimated_co2_kg")

        if estimated_override is not None:
            try:
                estimated_co2 = float(estimated_override)
            except ValueError:
                return Response({"error": "estimated_co2_kg must be a numeric value."}, status=status.HTTP_400_BAD_REQUEST)
            product_name = product_name or "Unknown Item"
        else:
            groq_key = os.environ.get("GROQ_API_KEY")
            if not groq_key:
                return Response({"error": "AI Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            groq_client = Groq(api_key=groq_key)
            
            system_instruction = (
                "You are an eco-compliance text parser. Extract the specific item name "
                "and any mass/weight value explicitly stated in the text. If no weight is found, "
                "provide a realistic fallback weight in kilograms based on standard items.\n\n"
                "Additionally, output a single 'search_query' keyword or phrase that represents the material "
                "type broadly (e.g., 'concrete', 'steel', 'plastic', 'wood', 'paper', 'glass', 'electronics') "
                "to assist in a database lookup.\n\n"
                "Return a strict JSON object with keys: 'clean_product_name' (string), "
                "'weight_kg' (float), and 'search_query' (string). "
                "Do not include conversational text or markdown code blocks."
            )

            try:
                completion = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": raw_text_content}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                parsed_json = json.loads(completion.choices[0].message.content)
                product_name = product_name or parsed_json.get("clean_product_name", "Unknown Item")
                weight_kg = float(parsed_json.get("weight_kg", 1.0))
                search_query = parsed_json.get("search_query", "materials")
            except Exception as e:
                return Response({"error": f"AI text parsing failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Step 2: Establish base communication configurations
            climatiq_url = os.environ.get("CLIMATIQ_API_URL", "https://api.climatiq.io").rstrip('/')
            climatiq_key = os.environ.get("CLIMATIQ_API_KEY")

            if not climatiq_key:
                return Response({"error": "Climatiq configuration missing."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            headers = {
                "Authorization": f"Bearer {climatiq_key}",
                "Content-Type": "application/json"
            }

            # Step 3: Run search query with data_version parameter included
            search_params = {
                "query": search_query,
                "unit_type": "weight",
                "data_version": "^33",
                "results_per_page": 1
            }

            try:
                search_response = requests.get(
                    f"{climatiq_url}/data/v1/search",
                    params=search_params,
                    headers=headers,
                    timeout=10
                )

                if search_response.status_code != 200:
                    return Response({"error": f"Climatiq database query failure: {search_response.text}"}, status=status.HTTP_502_BAD_GATEWAY)

                search_results = search_response.json().get("results", [])
                
                if not search_results:
                    activity_id = "materials-type_materials_unspecified" 
                else:
                    activity_id = search_results[0].get("activity_id")

                # Step 4: Run estimation calculations
                estimate_payload = {
                    "emission_factor": {
                        "activity_id": activity_id,
                        "data_version": "^33"
                    },
                    "parameters": {
                        "weight": weight_kg,
                        "weight_unit": "kg"
                    }
                }

                estimate_response = requests.post(
                    f"{climatiq_url}/data/v1/estimate",
                    json=estimate_payload,
                    headers=headers,
                    timeout=10
                )

                if estimate_response.status_code == 200:
                    estimated_co2 = float(estimate_response.json().get("co2e", 0.0))
                else:
                    return Response({"error": f"Climatiq mathematical calculation error: {estimate_response.text}"}, status=status.HTTP_502_BAD_GATEWAY)

            except requests.exceptions.RequestException as e:
                return Response({"error": f"Climatiq communication timeout: {str(e)}"}, status=status.HTTP_504_GATEWAY_TIMEOUT)

        # Step 5: Core System Evaluation (Dynamic Budget + Hazard Flags)
        profile = getattr(user, 'userprofile', None)
        if not profile:
            return Response({"error": "UserProfile missing."}, status=status.HTTP_404_NOT_FOUND)

        monthly_budget = getattr(profile, 'monthly_carbon_budget_kg', 300.0)
        current_accumulated = getattr(profile, 'current_month_accumulated_co2_kg', 0.0)
        projected_total = current_accumulated + estimated_co2
        offset_cost_kes = int(max(5, estimated_co2 * 15))

        # Explicit safety boundary rules to block hazardous inputs
        hazardous_keywords = ["asbestos", "toxic", "carcinogen", "hazardous", "lead paint", "chemical waste"]
        is_hazardous = any(keyword in product_name.lower() for keyword in hazardous_keywords)

        if is_hazardous:
            tier = "RED"
            msg = "ECOLOGICAL HAZARD CRITICAL: This material contains severe toxic components."
        elif projected_total > (monthly_budget * 2):
            tier = "RED"
            msg = "Consumption Restricted: Massive carbon budget overshoot."
        elif projected_total > monthly_budget:
            tier = "YELLOW"
            msg = "Target Exceeded: Bridgeable by programmatically purchasing Carbonmark credits via M-Pesa."
        else:
            tier = "GREEN"
            msg = "Safe Choice: This fits perfectly inside your active budget parameters."

        return Response({
            "product_name": product_name,
            "calculated_footprint_kg": round(estimated_co2, 3),
            "offset_cost_kes": offset_cost_kes,
            "user_metrics": {
                "current_month_total": current_accumulated,
                "monthly_budget": monthly_budget
            },
            "advisory_status": {
                "tier": tier,
                "message": msg
            }
        }, status=status.HTTP_200_OK)
    

class VoiceLogView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No voice recording file found under the 'file' parameter."}, status=status.HTTP_400_BAD_REQUEST)
        
        audio_file = request.FILES['file']
        groq_key = os.getenv("GROQ_API_KEY")

        if not groq_key:
            return Response({"error": "AI Audio Transcription Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 1. TRANSCRIPTION PHASE (Speech-To-Text)
        try:
            client = Groq(api_key=groq_key)
            transcription = client.audio.transcriptions.create(
                file=(audio_file.name, audio_file.read(), audio_file.content_type),
                model="whisper-large-v3",
                response_format="json",
                temperature=0.0
            )
            raw_text = transcription.text.strip()
        except Exception as api_error:
            return Response({"error": f"Speech-to-Text conversion failed: {str(api_error)}"}, status=status.HTTP_502_BAD_GATEWAY)

        # 2. INTENT EXTRACTION PHASE (LLM Structured Processing)
        system_guidance = (
            "You are an analytical intent processing engine.\n"
            "Analyze the voice transcript and classify it into one of two primary execution paths:\n"
            "1. 'route' -> If the user wants a trip planned or distances calculated between places.\n"
            "2. 'log' -> If the user is reporting a completed daily activity, energy usage, or meal ingestion.\n\n"
            "Provide your final classification strictly in JSON format matching this exact schema:\n"
            "{\n"
            "  \"intent\": \"route\" | \"log\",\n"
            "  \"extracted_payload\": {\n"
            "     \"origin\": \"string or null\",\n"
            "     \"destination\": \"string or null\",\n"
            "     \"vehicle_make\": \"string or null\",\n"
            "     \"category\": \"transportation\" | \"home_energy\" | \"diet\",\n"
            "     \"activity_type\": \"string (descriptive label describing what was done)\",\n"
            "     \"input_value\": float,\n"
            "     \"unit\": \"string (km, kWh, servings, etc)\",\n"
            "     \"co2e_kg\": float (Compute realistic carbon values. Savings are negative numbers, emissions are positive numbers)\n"
            "  }\n"
            "}\n"
            "Return ONLY raw JSON. No markdown ticks."
        )

        try:
            intent_completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_guidance},
                    {"role": "user", "content": f"Analyze this user voice transcript: \"{raw_text}\""}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            ai_analysis = json.loads(intent_completion.choices[0].message.content.strip())
            intent_type = ai_analysis.get("intent")
            payload = ai_analysis.get("extracted_payload", {})

        except Exception as err:
            return Response({"error": f"Failed parsing voice metrics alignment parameters: {str(err)}"}, status=status.HTTP_502_BAD_GATEWAY)

        # 3. ROUTING & DATA ACQUISITION EXECUTION FORKS
        if intent_type == "route":
            origin = payload.get("origin")
            destination = payload.get("destination")
            
            if not origin or not destination:
                return Response({"error": "Voice route command missing clear origin or destination tracking terms."}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                "action": "FORWARD_TO_ROUTE_PLANNER",
                "transcript_captured": raw_text,
                "inferred_parameters": {
                    "task": "route",
                    "origin": origin,
                    "destination": destination,
                    "vehicle_type": payload.get("unit") or "Car",
                    "vehicle_make": payload.get("vehicle_make") or "Standard ICE"
                }
            }, status=status.HTTP_200_OK)

        else:
            raw_input = payload.get("input_value")
            input_value = float(raw_input) if raw_input is not None else 1.0

            raw_co2e = payload.get("co2e_kg")
            co2e_kg = float(raw_co2e) if raw_co2e is not None else 0.0

            activity_type = payload.get("activity_type") or "Generic Logged Activity"
            category = payload.get("category") or "diet"
            unit = payload.get("unit") or "units"

            if not activity_type:
                activity_type = "Generic Logged Activity"

            log = ActivityLog.objects.create(
                user=request.user,
                category=category,
                activity_type=activity_type,
                input_value=input_value,
                unit=unit,
                co2e_kg=co2e_kg
            )

            return Response({
                "message": "Voice logging captured and committed successfully!",
                "raw_transcript": raw_text,
                "activity_logged": {
                    "category": log.category,
                    "type": log.activity_type,
                    "co2e_kg": log.co2e_kg
                }
            }, status=status.HTTP_201_CREATED)
        
class UserProfileDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        user_activities = ActivityLog.objects.filter(user=user).order_by('-id')
        
        cumulative_emitted_kg = 0.0
        cumulative_saved_kg = 0.0

        for log in user_activities:
            impact = float(log.co2e_kg or 0.0)
            if impact > 0:
                cumulative_emitted_kg += impact
            else:
                cumulative_saved_kg += abs(impact)

        paid_offset_kg = float(profile.cumulative_offset_kg or 0.0)
        
        total_lifetime_offset_kg = cumulative_saved_kg + paid_offset_kg

        net_outstanding_deficit_kg = max(0.0, cumulative_emitted_kg - total_lifetime_offset_kg)
        carbonmark_recommended_units = round(net_outstanding_deficit_kg / 1000.0, 4)

        history_list = []
        for log in user_activities:
            log_date = log.created_at.strftime("%B %d, %Y") if hasattr(log, 'created_at') and log.created_at else "Recent"
            log_time = log.created_at.strftime("%I:%M %p") if hasattr(log, 'created_at') and log.created_at else "Just Now"

            history_list.append({
                "log_id": log.id,
                "date": log_date,
                "time": log_time,
                "timestamp_raw": log.created_at.isoformat() if hasattr(log, 'created_at') and log.created_at else "",
                "category": log.category,
                "activity_description": log.activity_type,
                "metrics": {
                    "input_value": float(log.input_value or 0.0),
                    "unit": log.unit or "",
                    "co2e_impact_kg": float(log.co2e_kg or 0.0)
                }
            })

        payload = {
            "profile": {
                "username": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "phone_number": profile.phone_number, 
                "account_tier": profile.account_tier,
                "ai_query_count": profile.ai_query_count,
            },
            "lifetime_footprint_balance": {
                "cumulative_emitted_kg": round(cumulative_emitted_kg, 2),
                "cumulative_saved_kg": round(cumulative_saved_kg, 2), 
                "cumulative_offset_kg": round(paid_offset_kg, 2),   
                "total_lifetime_offset_kg": round(total_lifetime_offset_kg, 2), 
                "net_outstanding_deficit_kg": round(net_outstanding_deficit_kg, 2),
                "carbonmark_recommended_offset_units": carbonmark_recommended_units
            },
            "historical_activity_logs": history_list
        }

        return Response(payload, status=status.HTTP_200_OK)
    
#  PaymentStatusView - Complete and Working
class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, checkout_id):
        try:
            payment = PaymentLog.objects.get(
                mpesa_checkout_id=checkout_id,
                user=request.user
            )
            return Response({
                'status': payment.status,
                'payment_type': payment.payment_type,
                'amount': float(payment.amount),
                'created_at': payment.created_at,
                'completed_at': payment.completed_at,
                'metadata': payment.metadata
            }, status=status.HTTP_200_OK)
        except PaymentLog.DoesNotExist:
            return Response({
                'error': 'Payment not found',
                'checkout_id': checkout_id
            }, status=status.HTTP_404_NOT_FOUND)