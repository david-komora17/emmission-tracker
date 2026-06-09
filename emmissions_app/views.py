# your_app/views.py
import os
from groq import Groq
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Activity, SystemComplaint
from .serializers import SystemComplaintSerializers
from .permissions import isAdminUserRole, IsHighestPaidTier  # The permission class you wrote in Week 1
from .services.ai_coach import generate_eco_recommendations


class PremiumAICoachView(APIView):
    """
    Endpoint that fetches the user's latest tracked carbon metrics 
    and pipes them into Llama 3.1 via Groq for instantaneous suggestions.
    """
    # Enforces that users must be logged in AND have an active premium tier
    permission_classes = [IsAuthenticated, HasPremiumPlan]

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
            return [isAdminUserRole()]
        return [IsAuthenticated()]

    def get(self, request):
        complaints = SystemComplaint.objects.all()
        serializer = SystemComplaintSerializer(complaints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        serializer = SystemComplaintSerializer(data=request.data)
        if serializer.is_valid():
            # Automatically bind the logged in user to their complaint row.
            serializer.save(user, request.user)
            return Response(
                {"message": "Complaint is received and processed. Expect feedback shortly!"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PremiumEcoSwapperView(APIView):
    """
    Exclusive Premium tier feature.
    Takes a high emmission item and uses llama 3.1 to genrate clean replacements,
    Detailing the exact mathemeatical emmission drop and the environmental reasoning. 
    """
    permission_classes = [IsHighestPaidTier]

    def post(self, request):
        high_emmission_product = request.data.get('product_name') #Single use incandecent bulbs.
        current_co2e = request.data.get('co2e_value')

        if not high_emission_product:
            return Response({"error": "Product name is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response({"error": "AI service offline."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        client = Groq(api_key=api_key)

        # Prompt engineering to enforce product suggestions, metrics, and reasoning
        system_instruction = (
            "You are an advanced Eco-Product Replacement Engine for EcoTrack. "
            "Suggest exactly 1 lower-emission alternative for the product provided. "
            "State clearly: 1) What the replacement is. 2) By what specific measure/percentage "
            "it reduces emissions compared to the original. 3) The precise science of why. "
            "Be specific, clean, and concise. Do not use conversational intro filler."
        )

        user_input = f"Suggest a replacement for: '{high_emission_product}' which currently emits {current_co2e} kg CO2e."

        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.2,
                max_tokens=200
            )
            
            ai_analysis = completion.choices[0].message.content
            return Response({
                "original_item": high_emission_product,
                "replacement_analysis": ai_analysis
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": "Failed to generate AI analytics."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)