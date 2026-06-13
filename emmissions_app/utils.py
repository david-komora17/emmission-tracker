import os
import requests
import base64
from datetime import datetime

def get_mpesa_callback_url(request=None):
    """
    Dynamically routes the M-Pesa transaction results webhook.
    Uses the live Vercel domain in production, and falls back to the
    programmatic ngrok tunnel link during local execution.
    """
    #check if it is running in a live production environment
    if os.environ.get('VERCEL') == '1' or os.environ.get('PRODUCTION_HOST'):
        base_url = os.environ.get('PRODUCTION_HOST', '').rstrip('/')
        return f"{base_url}/api/payments/mpesa-callback/"
    
    #local fallback: try to query the programmtic ngrok client API
    try: 
        # Programmatic ngrok creates a local inspect engine on port 4040
        ngrok_api_response = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=1)

        if ngrok_api_response.status_code == 200:
            public_url = ngrok_api_response.json()['tunnels'][0]['public_url']
            return f"{public_url.rstrip('/')}/api/payments/mpesa-callback/"
        
    except Exception:
        pass

    # Last resort fallback localhost
    return "http://127.0.0.1:8000/api/payments/mpesa-callback/"

def generate_mpesa_credentials():
    """
    Generates OAuth tokens and security timestamps required by Daraja.
    """
    consumer_key = os.environ.get('MPESA_CONSUMER_KEY')
    consumer_secret = os.environ.get('MPESA_CONSUMER_SECRET')
    environment = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')
    
    # Fetch Access Token
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    if environment == 'production':
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
    response = requests.get(url, auth=(consumer_key, consumer_secret))
    access_token = response.json().get('access_token')
    
    # Generate Password Encryption Key
    shortcode = os.environ.get('MPESA_EXPRESS_SHORTCODE', '174379')
    passkey = os.environ.get('MPESA_PASSKEY', '')
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    password_string = f"{shortcode}{passkey}{timestamp}"
    encrypted_password = base64.b64encode(password_string.encode()).decode('utf-8')
    
    return access_token, encrypted_password, timestamp