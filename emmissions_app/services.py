import os
from emissions_dev import Client
from rest_framework.exceptions import ValidationError

def calculate_vehicle_emissions(distance_value, unit='km'):
    """
    Queries the emissions.dev REST API directly via standard HTTP POST.
    No extra third-party SDK installations required.
    """
    api_key = os.environ.get('EMISSIONS_DEV_API_KEY')
    if not api_key:
        raise ValidationError("Configuration Error: EMISSIONS_DEV_API_KEY is missing from your system environment.")
    
        url = "https://api.emissions.dev/v1/travel/car"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "distance": float(distance_value),
            "distance_unit": unit,
            "vehicle_type": "passenger_car",
            "fuel_type": "petrol"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
        
            if response.status_code == 200:
                data = response.json()
                # Grabbing the raw CO2e value in kilograms from their structured response
                return {
                    "co2e_kg": data.get("co2e"),
                    "audit_trail": data.get("source", "emissions.dev Engine Mix")
                }
            else:
                error_msg = response.json().get("error", response.text)
                raise ValidationError(f"emissions.dev engine rejected payload: {error_msg}")
            
        except requests.exceptions.RequestException as e:
            raise ValidationError(f"Failed to communicate with emissions.dev edge node: {str(e)}")