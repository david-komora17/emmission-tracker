# emmissions_app/models.py
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    """Extends standard user to manage subscription tier levels and track API quotas."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userprofile') # Changed related_name to match views
    is_premium = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # NEW QUOTA AND BUDGET FIELDS REQUIRED BY YOUR VIEWS:
    ai_query_count = models.IntegerField(default=0)  # Tracks the 5 free lookups
    monthly_carbon_budget_kg = models.FloatField(default=300.0)
    current_month_accumulated_co2_kg = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.user.username} - Premium: {self.is_premium}"
    
class SystemComplaint(models.Model):
    """The data store for the user feedback widget."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Complaint by {self.user.username} - {self.subject}"

class RegionalDefault(models.Model):
    """Stores regional fallback estimate if a user does not know their exact metrics."""
    country = models.CharField(max_length=100, default="Kenya")
    county_or_state = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=50)
    unit = models.CharField(max_length=20, default="kWh")
    region = models.CharField(max_length=100)   # e.g., 'Nairobi', 'Mombasa'
    default_value = models.FloatField()          # Baseline usage value

    class Meta:
        unique_together = ('country', 'county_or_state', 'category')

    def __str__(self):
        return f"{self.country} - {self.category} : {self.default_value} {self.unit}"
        
class ActivityLog(models.Model):
    CATEGORY_CHOICES = [
        ('transportation', 'Transportation'),
        ('home_energy', 'Home Energy'),
        ('diet', 'Diet'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    activity_type = models.CharField(max_length=100) # e.g., 'flight', 'vehicle', 'electricity'
    input_value = models.FloatField()                # User metric or injected smart default
    unit = models.CharField(max_length=20)
    co2e_kg = models.FloatField()                    # Computed dynamic output
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self): 
        return f"{self.user.username} - {self.category} - ({self.co2e_kg} kg CO2e)" # Fixed attribute name crash here

class ReductionTarget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    category = models.CharField(max_length=50)
    target_value_kg = models.FloatField()            # The ceiling target
    month_year = models.CharField(max_length=7)      # Format: 'YYYY-MM'