# your_app/views.py
import os
import requests
import json  # Added: Required to parse JSON content from Groq response payload
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status, permissions
from pypdf import PdfReader

from .serializers import SystemComplaintSerializer
from .utils import generate_mpesa_credentials, get_mpesa_callback_url
from .permissions import IsOwner, IsHighestPaidTier  # The permission class you wrote in Week 1
from .services.ai_coach import generate_eco_recommendations
from .models import UserProfile
from django.contrib.auth.models import User

# Hardcoded Security Gateways
ADMIN_SIGNUP_SECRET = "ClimatiqaSecureAdmin2026!Create"
ADMIN_LOGIN_SECRET = "ClimatiqaAdminSessionGateVerify2026"



class PremiumAICoachView(APIView):
    """
    Endpoint that fetches the user's latest tracked carbon metrics 
    and pipes them into Llama 3.1 via Groq for instantaneous suggestions.
    """
    # Enforces that users must be logged in AND have an active premium tier
    permission_classes = [IsAuthenticated, IsHighestPaidTier]

    def get(self, request, *args, **kwargs):
        user = request.user
        
        try:
            # Pull the single most recent activity entry logged by this user
            latest_log = Activity.objects.filter(user=user).latest('created_at')
        except Activity.DoesNotExist:
            return Response(
                {"suggestions": ["Log your first activity to unlock custom AI coaching tips!"]},
                status=status.HTTP_200_OK
            )

        # Call our isolated service layer
        ai_tips = generate_eco_recommendations(
            category=latest_log.category,       # e.g., 'transportation', 'home_energy'
            amount=latest_log.amount,           # e.g., 45 (miles or kWh)
            co2e_value=latest_log.co2e_metric  # Evaluated by Carbon Interface API in Week 2
        )

        return Response(
            {
                "meta": {
                    "last_logged_category": latest_log.category,
                    "impact_evaluated": f"{latest_log.co2e_metric} kg CO2e"
                },
                "suggestions": ai_tips
            },
            status=status.HTTP_200_OK
        )
    
class ComplaintFunnelView (APIView):
    """
    Dual-role view.
    - Authenticated Users can POST complaints via the widget.
    - Admin accounts can GET a list of all system complaints.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsOwner()]
        return [IsAuthenticated()]

    def get(self, request):
        complaints = SystemComplaint.objects.all()
        serializer = SystemComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        serializer = SystemComplaintSerializer(data=request.data)
        if serializer.is_valid():
            # Automatically bind the logged in user to their complaint row.
            serializer.save(user=request.user)
            return Response(
                {"message": "Complaint is received and processed. Expect feedback shortly!"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# Create a throttling policy inside your app or place this logic cleanly 
# Let's adjust PremiumEcoSwapperView inside your views.py to implement it:

class PremiumEcoSwapperView(APIView):
    """
    Tracks 5 consistent queries for free tier users, rendering HTTP 429 
    when exhausted to prompt React upgrade card layout rendering.
    Unlocks infinite queries for Premium users.
    """
    permission_classes = [IsAuthenticated] # Loosen permission so free users can use their quota

    def post(self, request):
        user = request.user
        
        # 1. Enforce the 5-query quota ceiling for free tier users
        if not getattr(user, 'is_premium', False):
            # Fallback to check if user profile fields exist
            if getattr(user, 'ai_query_count', 0) >= 5:
                return Response(
                    {
                        "error": "Quota Exceeded",
                        "message": "You have exhausted your 5 free standard AI swap optimization lookups."
                    }, 
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Increment the usage tracker gate
            user.ai_query_count = getattr(user, 'ai_query_count', 0) + 1
            user.save()

        # 2. Business Logic Execution via Groq
        high_emission_product = request.data.get('product_name')
        current_co2e = request.data.get('co2e_value', 0)

        if not high_emission_product:
            return Response({"error": "Product name is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response({"error": "AI service offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        client = Groq(api_key=api_key)
        system_instruction = (
            "You are an advanced Eco-Product Replacement Engine for Climatiqa. "
            "Suggest exactly 1 lower-emission alternative for the product provided. "
            "State clearly: 1) What the replacement is. 2) By what specific percentage "
            "it reduces emissions. 3) The precise science of why."
        )

        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": f"Suggest a replacement for: '{high_emission_product}' emitting {current_co2e} kg CO2e."}
                ],
                temperature=0.2,
                max_tokens=200
            )
            
            return Response({
                "original_item": high_emission_product,
                "replacement_analysis": completion.choices[0].message.content
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": "AI Engine failure"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
class CustomRegisterView(APIView):
    """
    Implicit RBAC Registration Engine.
    Removes the explicit 'role' parameter. Accounts default to 'USER' status.
    If the correct signup_secret is present in the payload, they are automatically
    provisioned as a system Administrator.
    """
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        signup_secret = request.data.get('signup_secret', '')# Optional for users required for admins.

        if not username or not password:
            return Response({"error": "Credentials required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "User already exists."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Initialize the base user instance
        user = User.objects.create_user(username=username, email=email, password=password)

        # 2. Dynamic roledetection based on the secret_key payload
        if signup_secret:
            if signup_secret == ADMIN_SIGNUP_SECRET:
                user.is_staff = True
                user.save()
            else:
            # If they tried to pass a secret but it's wrong, halt execution to prevent accidental signups
                user.delete()
                return Response({"error": "Invalid Sign-Up Secret. Account creation aborted."}, status=status.HTTP_401_UNAUTHORIZED)
        
        # 3. Create the profile attachment layer
        profile, created = UserProfile.objects.get_or_create(user=user)
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Account created successfully.",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "role": "ADMIN" if user.is_staff else "USER"
        }, status=status.HTTP_201_CREATED)

class SecretAdminHeaderPermission(permissions.BasePermission):
    """
    Checks for the explicit hardcoded system Admin Login Secret via request headers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.is_staff:
            return False
        
        # Look for custom verification header token
        client_secret = request.headers.get('X-Admin-Login-Secret')
        return client_secret == ADMIN_LOGIN_SECRET

class MpesaCheckoutView(APIView):
    """
    Initiates an M-Pesa Express STK Push payment sequence.
    Works seamlessly across Vercel cloud deployments and local tunnels.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone_number = request.data.get('phone_number') # Format: 2547XXXXXXXX
        amount = request.data.get('amount', 30) # Default subscription cost

        if not phone_number:
            return Response({"error": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token, password, timestamp = generate_mpesa_credentials()
            callback_url = get_mpesa_callback_url(request)
            
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "BusinessShortCode": os.environ.get('MPESA_EXPRESS_SHORTCODE', '174379'),
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(amount),
                "PartyA": phone_number,
                "PartyB": os.environ.get('MPESA_EXPRESS_SHORTCODE', '174379'),
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": f"Climatiqa-{request.user.username}",
                "TransactionDesc": "Premium Upgrade Subscription"
            }
            
            # Target Safaricom Sandbox
            url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
            if os.environ.get('MPESA_ENVIRONMENT') == 'production':
                url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

            response = requests.post(url, json=payload, headers=headers)
            response_data = response.json()

            if response_data.get("ResponseCode") == "0":
                return Response({
                    "message": "STK Push initiated successfully. Check your handset for the PIN prompt.",
                    "MerchantRequestID": response_data.get("MerchantRequestID"),
                    "CheckoutRequestID": response_data.get("CheckoutRequestID")
                }, status=status.HTTP_200_OK)
            else:
                return Response({"error": response_data.get("ResponseDescription", "Gateway error")}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": f"Failed to connect to gateway: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response({"error": "AI Engine Offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        client = Groq(api_key=api_key)
        system_instruction = (
            "You are an eco-compliance processor. Analyze the input text and extract the item name. "
            "Estimate its carbon footprint lifecycle weight in Kilograms of CO2e. "
            "Return a strict JSON object with keys: 'product_name' and 'estimated_co2_kg'. "
            "Do not include conversational conversational text or formatting outside the JSON."
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
            
            extracted = json.loads(completion.choices[0].message.content)
            product_name = extracted.get("product_name", "Unknown Item")
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