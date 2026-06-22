# your_app/views.py
import os
import requests
import json
from groq import Groq
from pypdf import PdfReader

from django.contrib.auth.models import User
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

# Import local modules cleanly
from .models import UserProfile, ActivityLog, SystemComplaint
from .permissions import IsOwner, IsHighestPaidTier 
from .utils import generate_mpesa_credentials, get_mpesa_callback_url
from .services.ai_coach import generate_eco_recommendations

# Import the updated serializers repository map
from .serializers import (
    SystemComplaintSerializer, 
    CustomTokenObtainPairSerializer, 
    CustomRegisterSerializer
)

# -------------------------------------------------------------------
# Permissions Layer
# -------------------------------------------------------------------
class PremiumTierPermission(IsAuthenticated):
    """
    Custom permission layer ensuring only users with active 
    premium tier subscription rows can utilize AI optimization services.
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        try:
            profile = request.user.user_profile  
            return bool(profile.is_premium)     
        except AttributeError:
            return False
        
class IsSystemAdmin(permissions.BasePermission):
    """
    Custom permission layer ensuring only staff accounts can read aggregated feedback data.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# -------------------------------------------------------------------
# Authentication Views (Login & Register Lifecycle)
# -------------------------------------------------------------------
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


# -------------------------------------------------------------------
# Operations & Processing Views (Premium AI, Payments & Ingestion)
# -------------------------------------------------------------------
class PremiumAIActionView(APIView):
    permission_classes = [PremiumTierPermission]
    throttle_classes = [UserRateThrottle]

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
            
            prompt = (
                f"You are an advanced multi-modal transit optimizer integrated with a Mapbox WebGL frontend.\n"
                f"The user wants to travel from {origin} to {destination} using a {vehicle_make} ({vehicle_type} engine).\n"
                f"1. Estimate the distance between these two points in Nairobi.\n"
                f"2. Provide highly specific milestone instructions.\n"
                f"3. Crucially, your response must be valid JSON matching this exact structure:\n"
                f"{{\n"
                f"  \"estimated_distance_km\": 12.5,\n"
                f"  \"milestones\": [\n"
                f"    {{\"distance_mark\": \"0km\", \"mode\": \"Drive\", \"text\": \"Start driving\"}}\n"
                f"  ],\n"
                f"  \"narrative\": \"Summary paragraph.\"\n"
                f"}}\n"
                f"Return ONLY the JSON block. No conversational introduction or markdown wrappers."
            )

            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }
                
                groq_response = requests.post(url, json=payload, headers=headers, timeout=10)
                ai_text = groq_response.json()['choices'][0]['message']['content']
                clean_json_data = json.loads(ai_text)
                return Response(clean_json_data, status=status.HTTP_200_OK)

            except Exception as e:
                return Response({"error": f"AI Engine Handshake Failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)


class ComplaintFunnelView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsSystemAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        complaints = SystemComplaint.objects.all()
        serializer = SystemComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        serializer = SystemComplaintSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                {"message": "Complaint is received and processed. Expect feedback shortly!"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MpesaCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount', 30)
        payload_phone = request.data.get('phone_number')

        try:
            profile, created = UserProfile.objects.get_or_create(user=user)
            saved_phone = profile.phone_number
        except Exception as e:
            return Response({"error": f"UserProfile retrieval/creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        final_phone = payload_phone or saved_phone

        if not final_phone:
            return Response(
                {
                    "error": "M-Pesa payment requires a mobile phone asset.",
                    "code": "PHONE_REQUIRED",
                    "detail": "No phone number linked to your profile."
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )

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
            try:
                token, password, timestamp = generate_mpesa_credentials()
            except Exception as auth_error:
                return Response({
                    "error": "The generate_mpesa_credentials() helper crashed.",
                    "details": str(auth_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                        
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
                return Response({
                    "error": "Safaricom gateway returned a non-JSON status error.",
                    "status_code": response.status_code,
                    "raw_response": response.text[:200]
                }, status=status.HTTP_400_BAD_REQUEST)
            
            response_data = response.json()
            if response_data.get("ResponseCode") == "0":
                return Response({
                    "message": "STK Push initiated. Verify on handset.",
                    "MerchantRequestID": response_data.get("MerchantRequestID"),
                    "CheckoutRequestID": response_data.get("CheckoutRequestID")
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": response_data.get("ResponseDescription", "Gateway execution rejected by upstream server.")}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response({"error": f"Gateway connection failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MpesaCarbonmarkCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        stk_callback = request.data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        merchant_request_id = stk_callback.get("MerchantRequestID", "UNKNOWN")
        
        # Safaricom expects a clean acknowledgment shape, even if we drop the execution internally
        safaricom_success_ack = {
            "ResponseCode": "0",
            "ResponseDescription": "success"
        }

        if result_code == 0:
            user_id = request.GET.get("user_id")
            offset_kg = request.GET.get("offset_kg", "10")
            
            try:
                # 1. Look up User first
                user = User.objects.get(id=user_id)
                profile = user.userprofile

                # 2. Guard constraint validation check
                if not profile.phone_number:
                    # Log internally if needed, but tell Safaricom we received it to prevent repeat retries
                    return Response(safaricom_success_ack, status=status.HTTP_200_OK)
                
                # 3. Hit Carbonmark Gateway APIs
                carbonmark_url = "https://api.carbonmark.com/v1/retirements"
                headers = {
                    "Authorization": f"Bearer {os.environ.get('CARBONMARK_API_KEY')}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "quantity": float(offset_kg) / 1000.0,
                    "project_id": "VCS-981",
                    "beneficiary_address": user.email,
                    "retirement_reason": f"Climatiqa Target Clearance for user {user.username}"
                }
                
                response = requests.post(carbonmark_url, json=payload, headers=headers, timeout=10)
                
                if response.status_code in [200, 201]:
                    profile.current_month_accumulated_co2_kg = max(0, profile.current_month_accumulated_co2_kg - float(offset_kg))
                    profile.save()
                    return Response(safaricom_success_ack, status=status.HTTP_200_OK)
                
            # Place specific exceptions BEFORE general Exception
            except User.DoesNotExist:
                return Response(safaricom_success_ack, status=status.HTTP_200_OK)
                
            except Exception as e:
                # Real programmatic crashes yield an explicit internal server 500 error sequence block
                return Response({"error": f"Internal mapping error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        return Response(safaricom_success_ack, status=status.HTTP_200_OK)

class ProductScannerIngestionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        raw_text_content = ""

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
        estimated_co2 = None
        estimated_override = request.data.get("estimated_co2_kg")

        if estimated_override is not None:
            try:
                estimated_co2 = float(estimated_override)
            except Exception:
                return Response({"error": "estimated_co2_kg must be a numeric value."}, status=status.HTTP_400_BAD_REQUEST)
            product_name = product_name or "Unknown Item"
        else:
            api_key = os.environ.get("GROQ_API_KEY")
            if not api_key:
                return Response({"error": "AI Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            client = Groq(api_key=api_key)
            system_instruction = (
                "You are an eco-compliance processor. Analyze the input text and extract the item name. "
                "Estimate its carbon footprint lifecycle weight in Kilograms of CO2e. "
                "Return a strict JSON object with keys: 'product_name' and 'estimated_co2_kg'. "
                "Do not include conversational text or formatting outside the JSON."
            )

            try:
                completion = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": raw_text_content}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                content = completion.choices[0].message.content

                if isinstance(content, dict):
                    extracted = content
                else:
                    try:
                        extracted = json.loads(content)
                    except Exception:
                        start = str(content).find('{')
                        end = str(content).rfind('}')
                        if start != -1 and end != -1 and end > start:
                            extracted = json.loads(str(content)[start:end+1])
                        else:
                            raise ValueError("Unable to parse AI response as JSON")

                product_name = product_name or extracted.get("product_name", "Unknown Item")
                estimated_co2 = float(extracted.get("estimated_co2_kg", 0.0))
            except Exception as e:
                return Response({"error": f"AI Parsing failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        profile = getattr(user, 'userprofile', None)
        if not profile:
            return Response({"error": "UserProfile missing."}, status=status.HTTP_404_NOT_FOUND)

        monthly_budget = getattr(profile, 'monthly_carbon_budget_kg', 300.0)
        current_accumulated = getattr(profile, 'current_month_accumulated_co2_kg', 0.0)
        projected_total = current_accumulated + estimated_co2
        offset_cost_kes = int(max(5, estimated_co2 * 15))

        if projected_total > (monthly_budget * 2):
            tier = "RED"
            msg = "Action Restricted: Massive carbon budget overshoot."
        elif projected_total > monthly_budget:
            tier = "YELLOW"
            msg = "Target Exceeded: Bridgeable by programmatically purchasing Carbonmark credits via M-Pesa."
        else:
            tier = "GREEN"
            msg = "Safe Choice: This fits perfectly inside your active budget parameters."

        return Response({
            "product_name": product_name,
            "calculated_footprint_kg": estimated_co2,
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
    """
    Ingests raw audio asset attachments (.mp3, .wav, .m4a), 
    transcribes them remotely using Groq's Whisper API engine, 
    and classifies carbon metrics against matching text patterns.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # Allows file upload streaming

    def post(self, request):
        # 1. Enforce validation check on incoming files
        if 'file' not in request.FILES:
            return Response({"error": "No voice recording file found under the 'file' parameter attribute key."}, status=status.HTTP_400_BAD_REQUEST)
        
        audio_file = request.FILES['file']
        groq_key = os.getenv("GROQ_API_KEY")

        if not groq_key:
            return Response({"error": "AI Audio Transcription Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # 2. Handshake directly with Groq's remote Whisper translation model
        try:
            client = Groq(api_key=groq_key)
            
            # Pass file tuple mapping payload straight down the pipeline network
            transcription = client.audio.transcriptions.create(
                file=(audio_file.name, audio_file.read(), audio_file.content_type),
                model="whisper-large-v3",
                response_format="json",
                temperature=0.0
            )
            
            # Extracted clear raw string sentence configuration block
            raw_text = transcription.text.lower()

        except Exception as api_error:
            return Response({"error": f"Speech-to-Text conversion failed: {str(api_error)}"}, status=status.HTTP_502_BAD_GATEWAY)

        # 3. Process pattern match operations locally
        if "run" in raw_text or "jog" in raw_text:
            activity_type = "Running"
            impact_score = 0.0 
        elif "bulb" in raw_text or "led" in raw_text:
            activity_type = "Energy Efficiency Upgrade"
            impact_score = -10.5
        else:
            activity_type = "Generic Activity"
            impact_score = 0.0

        # 4. Document update tracking rows securely
        log = ActivityLog.objects.create(
            user=request.user,
            description=f"Voice Logged: {raw_text}",
            category=activity_type,
            score=impact_score
        )

        return Response({
            "message": "Voice entry transcribed and synthesized successfully!",
            "matched_category": activity_type,
            "raw_transcript": raw_text,
            "impact_score": impact_score
        }, status=status.HTTP_201_CREATED)