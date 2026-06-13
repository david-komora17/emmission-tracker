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