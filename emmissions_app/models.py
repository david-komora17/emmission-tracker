from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class UserProfile(models.Model):
    """Extends standard user to manage subscription tier levels."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_premium = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - Premium: {self.is_premium}."
    
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
    """ Stores regional fall back estimate if a user doesnot know their exact metrics."""
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
    co2e_kg = models.FloatField()                    # Computed dynamic output returned by Carbon Interface
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def  __str__(self): 
        return f"{self.user.username} - {self.category} - ({self.co2e_metric} kg CO2e)"   

class ReductionTarget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    category = models.CharField(max_length=50)
    target_value_kg = models.FloatField()            # The ceiling target
    month_year = models.CharField(max_length=7)      # Format: 'YYYY-MM'