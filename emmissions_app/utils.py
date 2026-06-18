import os
import requests
import base64
from datetime import datetime
from rest_framework.exceptions import APIException

def get_mpesa_callback_url(request=None):
    """
    Dynamically routes the M-Pesa transaction results webhook.
    Uses the live Vercel domain in production, and falls back to the
    programmatic ngrok tunnel link during local execution.
    """
    # Check if it is running in a live production environment
    if os.environ.get('VERCEL') == '1' or os.environ.get('PRODUCTION_HOST'):
        base_url = os.environ.get('PRODUCTION_HOST', '').rstrip('/')
        return f"{base_url}/api/payments/mpesa-callback/"
    
    # Local fallback: try to query the programmatic ngrok client API
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
    Safely handles bad credentials and non-JSON server drops.
    """
    consumer_key = os.environ.get('MPESA_CONSUMER_KEY')
    consumer_secret = os.environ.get('MPESA_CONSUMER_SECRET')
    environment = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')
    
    # Structural configuration check
    if not consumer_key or not consumer_secret:
        raise APIException("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in environment variables (.env file).")

    # Fetch Access Token URL Setup
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    if environment == 'production':
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
    try:
        response = requests.get(url, auth=(consumer_key, consumer_secret), timeout=10)
        
        # Catch explicit status errors (e.g. 401 Unauthorized for bad keys)
        if response.status_code != 200:
            raise APIException(
                f"Safaricom Auth Gateway returned HTTP {response.status_code}. "
                f"Ensure your consumer keys match Daraja dashboard. Details: {response.text[:150]}"
            )
            
        token_data = response.json()
        access_token = token_data.get('access_token')
        
    except ValueError:
        # Intercepts the HTML "line 1 column 1 (char 0)" JSON decode error right here
        raise APIException(
            f"Safaricom returned raw text/HTML instead of a JSON token. "
            f"Status Code: {response.status_code}. Raw Body snippet: {response.text[:200]}"
        )
    except requests.exceptions.RequestException as e:
        raise APIException(f"Network timeout/connectivity issue with Safaricom server: {str(e)}")

    if not access_token:
        raise APIException("OAuth handshake succeeded, but token payload was empty.")

    # Generate Password Encryption Key
    shortcode = os.environ.get('MPESA_EXPRESS_SHORTCODE', '174379')
    # Support both MPESA_PASSKEY and MPESA_LNM_PASSKEY seamlessly
    passkey = os.environ.get('MPESA_PASSKEY') or os.environ.get('MPESA_LNM_PASSKEY', '')
    
    if not passkey:
        raise APIException("Missing Lipa Na M-Pesa Passkey (MPESA_PASSKEY) in your environment settings.")

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    password_string = f"{str(shortcode).strip()}{str(passkey).strip()}{timestamp}"
    encrypted_password = base64.b64encode(password_string.encode()).decode('utf-8')
    
    return access_token, encrypted_password, timestamp