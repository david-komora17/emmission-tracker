# your_app/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Activity, SystemComplaint
from .serializers import SystemComplaintSerializers
from .permissions import isAdminUserRole  # The permission class you wrote in Week 1
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