from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class RegionalDefault(models.Model):
    """ Stores regional fall back estimate if a user doesnot know their exact metrics."""
    country = models.CharField(max_length=100, default="Kenya")
    county_or_state = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=50)
    default_value = models.FloatField()
    unit = models.CharField(max_length=20, default="kWh")

    class Meta:
        unique_together = ('country', 'county', 'category')

        def __str__(self):
            return f"{self.country} - {self.category} : {self.default_value} {self.unit}"
        
class Activity(models.Model):
    """Main model tracking user daily carbon footprints."""
    CATEGORY_CHOICES = [
        ('transportation', 'Transportation(vehicles/flight)'),
        ('home_energy', 'Home Energy (Electricity/Gas)'),
        ('diet', 'Dietary Consumption'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    sub_category = models.CharField(max_length=50) # e.g., 'flight', 'car_mileage', 'electricity'
    amount = models.FloatField() # Raw numerical input (miles, kWh, kg of meat)
    unit = models.CharField(max_length=20) # 'mi', 'kwh', 'kg'

    # Value calculated and returned from the Carbon Interface API
    co2e_metric = models.FloatField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def  __str__(self): 
        return f"{self.user.username} - {self.category} - ({self.co2e_metric} kg CO2e)"            