# emmissions_app/models.py
from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta
from django.utils import timezone

def get_default_expiry():
    return timezone.now()

class UserProfile(models.Model):
    """
    ONE UNIFIED PROFILE MODEL
    Manages subscription levels, profile settings, API quotas, and carbon ledger balances.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userprofile')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # Tier Systems (Both variants merged safely)
    is_premium = models.BooleanField(default=False)
    account_tier = models.CharField(max_length=20, default='Free')
    
    # Quotas, Budgets & Historical Balances
    ai_query_count = models.IntegerField(default=0)  # Tracks lookup numbers
    monthly_carbon_budget_kg = models.FloatField(default=300.0)
    current_month_accumulated_co2_kg = models.FloatField(default=0.0)
    cumulative_offset_kg = models.FloatField(default=0.0) # Carbonmark retirement tracker

    premium_expiry_date = models.DateTimeField(default=get_default_expiry)
    mpesa_checkout_request_id = models.CharField(max_length=100, blank=True, null=True, unique=True)

    def activate_premium_one_month(self):
        """
        Sets account flags to premium and shifts the subscription timeline window 
        exactly 30 days into the future.
        """
        self.is_premium = True
        self.account_tier = "Premium"
        self.premium_expiry_date = timezone.now() + timedelta(days=30)
        self.save()

    def __str__(self):
        return f"{self.user.username} - Tier: {self.account_tier} (Premium: {self.is_premium})"

class SystemComplaint(models.Model):
    """The data store for the user feedback widget."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('addressed', 'Addressed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    response = models.TextField(blank=True, null=True)  # Admin response
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Track last update
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Complaint by {self.user.username} - {self.subject} ({self.status})"

class RegionalDefault(models.Model):
    """Stores regional fallback estimate if a user does not know their exact metrics."""
    country = models.CharField(max_length=100, default="Kenya")
    county_or_state = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=50)
    unit = models.CharField(max_length=20, default="kWh")
    region = models.CharField(max_length=100)
    default_value = models.FloatField()

    class Meta:
        unique_together = ('country', 'county_or_state', 'category')

    def __str__(self):
        return f"{self.country} - {self.category} : {self.default_value} {self.unit}"
        

class ActivityLog(models.Model):
    CATEGORY_CHOICES = [
        ('transportation', 'Transportation'),
        ('home_energy', 'Home Energy'),
        ('diet', 'Diet'),
        ('payment', 'Payment'), 
        ('offset', 'Carbon Offset'),  
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    activity_type = models.CharField(max_length=100)
    input_value = models.FloatField()
    unit = models.CharField(max_length=20)
    co2e_kg = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self): 
        return f"{self.user.username} - {self.category} - ({self.co2e_kg} kg CO2e)"


class ReductionTarget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    category = models.CharField(max_length=50)
    target_value_kg = models.FloatField()
    month_year = models.CharField(max_length=7)


class RouteSearchLog(models.Model):
    """Parent log container for 'Google-like' location search histories."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='route_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    origin_name = models.CharField(max_length=255)
    destination_name = models.CharField(max_length=255)
    total_distance_km = models.FloatField()
    carbon_emitted_kg = models.FloatField()
    carbon_saved_kg = models.FloatField()
    is_offset = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Route for {self.user.username} on {self.timestamp.strftime('%Y-%m-%d')}"


class MilestoneInterceptLog(models.Model):
    """Child log segment identifying dynamic multi-modal switches."""
    MODE_CHOICES = [
        ('DRIVE', 'Drive (ICE)'),
        ('PARK_AND_RIDE', 'Park & Ride Intercept'),
        ('ELECTRIC_MOTORCYCLE', 'Electric Motorcycle'),
        ('UBER', 'Uber (Hailing)'),
        ('WALK', 'Walk'),
    ]
    route_log = models.ForeignKey(RouteSearchLog, on_delete=models.CASCADE, related_name='milestones')
    step_index = models.IntegerField()
    mode = models.CharField(max_length=30, choices=MODE_CHOICES)
    instruction = models.TextField()
    distance_km = models.FloatField()
    emissions_kg = models.FloatField()

    class Meta:
        ordering = ['step_index']

    def __str__(self):
        return f"Step {self.step_index} for Log {self.route_log.id}"
    

class PaymentLog(models.Model):
    PAYMENT_TYPES = [
        ('subscription', 'Premium Subscription'),
        ('carbon_credits', 'Carbon Credits'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    metadata = models.JSONField(default=dict, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    mpesa_checkout_id = models.CharField(max_length=100, db_index=True)  
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mpesa_checkout_id']),
            models.Index(fields=['user', 'status']),
        ]