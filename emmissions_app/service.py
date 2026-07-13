# emmissions_app/services.py
import os
import requests
from rest_framework.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

def retire_carbonmark_credits(amount_kes, beneficiary_name, retirement_reason="Offset via App"):
    """
    Retires carbon credits programmatically using the Carbonmark API.
    Converts KES amount into an approximate token volume or directly offsets using 
    real-time pricing from available project listings.
    """
    api_key = os.environ.get('CARBONMARK_API_KEY')
    if not api_key:
        raise ValidationError("Configuration Error: CARBONMARK_API_KEY is missing from environment.")

    base_url = "https://v1.api.carbonmark.com"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    # 1. Convert KES to tonnes (Assuming a fixed baseline conversion or an approximate target)
    # E.g., baseline calculation for KES to Tonnes (Adjust this based on your business logic)
    # Let's assume 1 Tonne ≈ 1,500 KES for illustration
    tonnes_to_retire = max(0.001, float(amount_kes) / 1500.0) 

    try:
        # 2. Pick a high-integrity baseline project (e.g., ICR-112 or similar default pool)
        # First, find current pricing and asset source ID
        price_url = f"{base_url}/prices?projectIds=ICR-112"
        price_res = requests.get(price_url, headers=headers, timeout=10)
        
        if price_res.status_code != 200 or not price_res.json():
            raise ValidationError("Failed to fetch current carbon credit prices from Carbonmark.")
        
        # Grab the first available listing asset price source ID
        asset_price_source_id = price_res.json()[0].get("sourceId")

        # 3. Request a formal quote
        quote_url = f"{base_url}/quotes"
        quote_payload = {
            "asset_price_source_id": asset_price_source_id,
            "quantity_tonnes": tonnes_to_retire
        }
        quote_res = requests.post(quote_url, json=quote_payload, headers=headers, timeout=10)
        if quote_res.status_code != 200:
            raise ValidationError(f"Carbonmark rejected quote request: {quote_res.text}")
        
        quote_uuid = quote_res.json().get("uuid")

        # 4. Execute the final retirement transaction
        order_url = f"{base_url}/orders"
        order_payload = {
            "quote_uuid": quote_uuid,
            "beneficiary_name": beneficiary_name,
            "retirement_reason": retirement_reason
        }
        order_res = requests.post(order_url, json=order_payload, headers=headers, timeout=10)
        
        if order_res.status_code in [200, 201]:
            order_data = order_res.json()
            # Return structural details along with total retired kg for your local ledger tracking
            return {
                "success": True,
                "retired_kg": tonnes_to_retire * 1000.0,
                "transaction_id": order_data.get("uuid", ""),
                "certificate_url": order_data.get("receiptUrl", "")
            }
        else:
            raise ValidationError(f"Carbonmark order execution failed: {order_res.text}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Carbonmark network communication breakdown: {str(e)}")
        raise ValidationError(f"Failed to communicate with Carbonmark edge nodes: {str(e)}")