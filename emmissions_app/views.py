# your_app/views.py
import os
import requests
import json  # Added: Required to parse JSON content from Groq response payload
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.throttling import UserRateThrottle
from pypdf import PdfReader

from .serializers import SystemComplaintSerializer
from .utils import generate_mpesa_credentials, get_mpesa_callback_url
from .permissions import IsOwner, IsHighestPaidTier  # The permission class you wrote in Week 1
from .services.ai_coach import generate_eco_recommendations
from .models import UserProfile, ActivityLog, SystemComplaint
from django.contrib.auth.models import User

# Hardcoded Security Gateways
ADMIN_SIGNUP_SECRET = "ClimatiqaSecureAdmin2026!Create"

class PremiumTierPermission(IsAuthenticated):
    """
    Custom permission layer ensuring only users with active 
    premium tier subscription rows can utilize AI optimization services.
    """
    def has_permission(self, request, view):
        # Check standard login status first via DRF's built-in IsAuthenticated
        if not super().has_permission(request, view):
            return False
        
        try:
            # Safely access the user's related profile record
            profile = request.user.user_profile  
            return bool(profile.is_premium)     
        except AttributeError:
            return False
        
class PremiumAIActionView(APIView):
    # (Your permission and throttle classes remain active here)
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
            vehicle_type = request.data.get("vehicle_type")  # e.g., GASOLINE
            vehicle_make = request.data.get("vehicle_make")  # e.g., Jaguar F-Type

            if not origin or not destination:
                return Response({"error": "Origin and destination fields are required."}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Hit the Free Open Source Routing Machine (OSRM) API
            # This demo endpoint uses coordinates. For text addresses, we use OSRM's free demo engine or approximate.
            # For rapid development, we pass the textual locations directly to Llama to act as the spatial engine:
            
            prompt = (
                f"You are an advanced multi-modal transit optimizer integrated with a Mapbox WebGL frontend.\n"
                f"The user wants to travel from {origin} to {destination} using a {vehicle_make} ({vehicle_type} engine).\n"
                f"1. Estimate the distance between these two points in Nairobi.\n"
                f"2. Provide highly specific milestone instructions. For example: 'After 2.5km, park the Jaguar and catch the electric train.'\n"
                f"3. Crucially, your response must be valid JSON matching this exact structure so the frontend can parse it:\n"
                f"{{\n"
                f"  \"estimated_distance_km\": 12.5,\n"
                f"  \"milestones\": [\n"
                f"    {{\"distance_mark\": \"0km\", \"mode\": \"Drive\", \"text\": \"Start driving your Jaguar F-Type\"}},\n"
                f"    {{\"distance_mark\": \"2.5km\", \"mode\": \"Train\", \"text\": \"Park at the transit hub and board the Electric Train to bypass emissions\"}}\n"
                f"  ],\n"
                f"  \"narrative\": \"Your full carbon coaching summary paragraph goes here.\"\n"
                f"}}\n"
                f"Return ONLY the JSON block. No conversational introduction or markdown wrappers."
            )

            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2  # Low temperature keeps JSON outputs strict and reliable
                }
                
                groq_response = requests.post(url, json=payload, headers=headers, timeout=10)
                ai_text = groq_response.json()['choices'][0]['message']['content']
                
                # Parse the strict JSON string out to hand it cleanly back to React
                clean_json_data = json.loads(ai_text)
                return Response(clean_json_data, status=status.HTTP_200_OK)

            except Exception as e:
                return Response({"error": f"AI Engine Handshake Failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
    
class IsSystemAdmin(permissions.BasePermission):
    """
    Custom permission layer ensuring only staff accounts can read aggregated feedback data.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = "ADMIN" if self.user.is_staff else "USER"
        return data

class ComplaintFunnelView(APIView):
    """
    Dual-role system dashboard funnel view.
    - Authenticated users (USER and ADMIN) can POST system complaints.
    - System Admin staff accounts can GET a list of all complaints.
    """
    # Enforce base authentication globally across both actions first
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Overrides permission constraints selectively based on HTTP method state
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
    

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Standard login serializer. No login secrets required.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        # Append role to the login payload dynamically for the React client
        data['role'] = "ADMIN" if self.user.is_staff else "USER"
        return data


class CustomLoginView(TokenObtainPairView):
    """
    The Login Endpoint. 
    Requires ONLY username and personal password. 
    Admin accounts log in normally without needing a login secret.
    """
    serializer_class = CustomTokenObtainPairSerializer

class CustomRegisterView(APIView):
    """
    Registration Engine.
    - Username and password are strictly mandatory for everyone.
    - Email is mandatory and must contain a valid '@' symbol.
    - Phone number is optional, but no two accounts can share the same non-null phone number.
    - Passing the correct signup_secret provisions an Admin account (is_staff).
    """

    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '').strip()  # Capture and strip whitespace
        phone_number = request.data.get('phone_number')  # Expected format: 2547XXXXXXXX or None/blank
        signup_secret = request.data.get('signup_secret', '')

        # 1. Enforce Mandatory field checks (Removed phone_number from here)
        if not username or not password:
            return Response(
                {"error": "Username and password are strictly required fields."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Enforce Mandatory Email Presence and Format check
        if not email:
            return Response(
                {"error": "Email is a strictly required field."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if '@' not in email:
            return Response(
                {"error": "Invalid email formatting. Missing '@' symbol."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Prevent Duplicate Usernames
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Handle Optional but Unique Phone Number Check
        cleaned_phone = None
        if phone_number:
            cleaned_phone = str(phone_number).strip()
            if cleaned_phone == "":
                cleaned_phone = None
            else:
                # Prevent Duplicate Phone Numbers across all system accounts only if provided
                if UserProfile.objects.filter(phone_number=cleaned_phone).exists():
                    return Response(
                        {"error": "This phone number is already linked to another account."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # 5. Create the Django User instance
        user = User.objects.create_user(username=username, email=email, password=password)

        # 6. Handle Admin provisioning explicitly via sign-up secret check
        if signup_secret:
            if signup_secret == ADMIN_SIGNUP_SECRET:
                user.is_staff = True
                user.save()
            else:
                # Malformed or wrong secret: delete the user and abort
                user.delete()
                return Response({"error": "Invalid Sign-Up Secret."}, status=status.HTTP_401_UNAUTHORIZED)
        
        # 7. Save verified unique phone number (or None) to profile layer
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.phone_number = cleaned_phone
        profile.save()

        # Generate structural tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Account created successfully.",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "role": "ADMIN" if user.is_staff else "USER"
        }, status=status.HTTP_201_CREATED)
    
class MpesaCheckoutView(APIView):
    """
    STK Push checkout sequence.
    Pulls phone number natively out of the authenticated user's DB profile,
    or accepts an ad-hoc phone number in the request body if missing.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        amount = request.data.get('amount', 30)
        payload_phone = request.data.get('phone_number')

        # 1. Resolve phone number location (Self-healing: creates profile if missing)
        try:
            # Fallback to standard lowercase userprofile if custom related_name isn't used
            profile, created = UserProfile.objects.get_or_create(user=user)
            saved_phone = profile.phone_number
        except Exception as e:
            return Response({"error": f"UserProfile retrieval/creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Prioritize the incoming payload phone over the DB fallback state
        final_phone = payload_phone or saved_phone

        if not final_phone:
            return Response(
                {
                    "error": "M-Pesa payment requires a mobile phone asset.",
                    "code": "PHONE_REQUIRED",
                    "detail": "No phone number linked to your profile. Please provide a phone_number parameter in the request body."
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clean the string formatting (Ensure no whitespaces or unexpected characters mess up Daraja)
        final_phone = str(final_phone).strip()

        # Simple pattern verification for typical Kenyan mobile payloads (2547XXXXXXXX or 2541XXXXXXXX)
        if not final_phone.startswith('254') or len(final_phone) != 12:
            return Response(
                {"error": "Malformed payment phone format. Value must strictly match 2547XXXXXXXX format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Dynamic profile save state update
        # If they didn't have a phone number on profile, save this valid one so their future flows are clean
        if not saved_phone:
            profile.phone_number = final_phone
            profile.save()

        # 3. Proceed to the standard credentials gateway handshake
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
    """
    The closing loop endpoint. Incepts Safaricom payment confirmations,
    converts the parameters, and communicates directly with Carbonmark's
    REST API to programmatically retire carbon credits via your key.
    """
    permission_classes = [permissions.AllowAny] # Safaricom demands open webhook visibility

    def post(self, request):
        stk_callback = request.data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        
        if result_code == 0: # 0 indicates the user input their M-Pesa PIN successfully
            # Extract target footprint to offset passed dynamically via your query parameters
            # e.g., your callback URL was: https://yourdomain.com/api/callback/?user_id=1&offset_kg=12
            user_id = request.GET.get("user_id")
            offset_kg = request.GET.get("offset_kg", "10")
            
            try:
                user = User.objects.get(id=user_id)
                
                # Call Carbonmark REST offset retirement endpoint
                carbonmark_url = "https://api.carbonmark.com/v1/retirements"
                headers = {
                    "Authorization": f"Bearer {os.environ.get('CARBONMARK_API_KEY')}",
                    "Content-Type": "application/json"
                }
                
                # Carbonmark payload to retire micro-fractions of carbon assets instantly
                payload = {
                    "quantity": float(offset_kg) / 1000.0, # Convert kilograms to metric tonnes
                    "project_id": "VCS-981", # Replace with your target verified project registry ID
                    "beneficiary_address": user.email,
                    "retirement_reason": f"Climatiqa Target Clearance for user {user.username}"
                }
                
                response = requests.post(carbonmark_url, json=payload, headers=headers, timeout=10)
                
                if response.status_code in [200, 201]:
                    # Deduct the offset amount from user's month-to-date tracking column balance
                    profile = user.userprofile
                    profile.current_month_accumulated_co2_kg = max(0, profile.current_month_accumulated_co2_kg - float(offset_kg))
                    profile.save()
                    
                    return Response({"status": "Success. Carbonmark Credit Programmatically Retired."}, status=status.HTTP_200_OK)
                
            except Exception as e:
                return Response({"error": f"Internal mapping error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        return Response({"message": "Transaction declined by consumer handset"}, status=status.HTTP_200_OK)
    
class ProductScannerIngestionView(APIView):
    """
    Ingests scanned product QR text or uploaded PDF files.
    Calculates footprints and maps them against user budget targets
    to return dynamic GREEN, YELLOW, or RED styling states to React.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        raw_text_content = ""

        # 1. Parse Data Input (File Upload vs Raw QR Text)
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

        # 2. Extract Details & Estimate Footprint using Llama 3.1 on Groq
        # Allow test/dev clients to supply the parsed values directly to skip the AI step.
        product_name = request.data.get("product_name")
        estimated_co2 = None

        # Client override (useful for Thunder Client tests): if provided, skip AI call
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

                # Handle different possible response shapes from the SDK
                if isinstance(content, dict):
                    extracted = content
                else:
                    # Try to parse JSON string; if the model returned extra text, extract JSON block
                    try:
                        extracted = json.loads(content)
                    except Exception:
                        start = str(content).find('{')
                        end = str(content).rfind('}')
                        if start != -1 and end != -1 and end > start:
                            try:
                                extracted = json.loads(str(content)[start:end+1])
                            except Exception as e:
                                raise e
                        else:
                            raise ValueError("Unable to parse AI response as JSON")

                product_name = product_name or extracted.get("product_name", "Unknown Item")
                estimated_co2 = float(extracted.get("estimated_co2_kg", 0.0))
            except Exception as e:
                return Response({"error": f"AI Parsing failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Target Threshold Boundaries Check
        profile = getattr(user, 'userprofile', None)
        if not profile:
            return Response({"error": "UserProfile missing."}, status=status.HTTP_404_NOT_FOUND)

        monthly_budget = getattr(profile, 'monthly_carbon_budget_kg', 300.0)
        current_accumulated = getattr(profile, 'current_month_accumulated_co2_kg', 0.0)
        projected_total = current_accumulated + estimated_co2
        
        # Base financial estimation conversion rule (KES 15 per kg CO2)
        offset_cost_kes = int(max(5, estimated_co2 * 15))

        # 4. Assign the Dynamic Color Advisory Tiers
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
    def post(self, request):
        raw_text = request.data.get('raw_text', '').lower()
        
        if not raw_text:
            return Response({"error": "No voice transcript found."}, status=status.HTTP_400_BAD_REQUEST)

        # Simple, fast, free keyword matching engine
        if "run" in raw_text or "jog" in raw_text:
            activity_type = "Running"
            impact_score = 0.0 # Calculate your metrics
        elif "bulb" in raw_text or "led" in raw_text:
            activity_type = "Energy Efficiency Upgrade"
            impact_score = -10.5
        else:
            activity_type = "Generic Activity"
            impact_score = 0.0

        # Create the database entry seamlessly
        log = ActivityLog.objects.create(
            user=request.user,
            description=f"Voice Logged: {raw_text}",
            category=activity_type,
            score=impact_score
        )

        return Response({
            "message": "Voice entry synthesized successfully!",
            "matched_category": activity_type,
            "raw_transcript": raw_text
        }, status=status.HTTP_201_CREATED)