# Climatiqa Carbon intelligence

An advanced, eco-compliance and sustainable ledger backend platform powered by Django REST Framework (DRF) and Llama 3.1 LLMs via Groq. This system offers automated carbon footprint calculations, structural transport route optimizations, smart multi-modal product scanning, voice-driven product inputs and seamless M-Pesa integration matched with Carbonmark environmental credit retirement.

---

## Key System Features

* **Intelligent Authentication:** Custom JWT engine running on `rest_framework_simplejwt` with self-healing profile initialization and atomic registration isolates.
* **LLM Emission Calc Engine:** Route optimizing engine that returns strictly structured milestone parsing parameters and exact carbon reduction estimates.
* **Omni-Parser Product Ingestion:** Ingests raw text, QR codes, or native PDF documents (using `pypdf`) to dynamically calculate product life cycle weights and issue color-coded advisory budget tiers.
* **Voice Log Processing:** AI speech-to-text pipeline utilizing `Whisper-Large-V3` paired with an internal JSON router logic gate that separates tracking intentions from mapping coordinates.
* **M-Pesa Payment Pipeline:** Direct connection to Safaricom's STK Push gateway to manage premium unlocks and programmatically execute climate retirements on the Carbonmark APIs.

---

##  Tech Stack Architecture

* **Framework:** Django & Django REST Framework (DRF)
* **Authentication:** JSON Web Tokens (SimpleJWT)
* **LLM Processing:** Groq SDK (`llama-3.1-8b-instant`, `whisper-large-v3`)
* **Document Parsing:** PyPDF
* **External APIs:** Safaricom M-Pesa Express Gateway, Carbonmark API (`v1/retirements`)

---

##  API Endpoint Directory & Schema Reference

### 1. Authentication Layer

#### `POST /api/auth/login/`
* **Access:** `AllowAny`
* **Payload Requirements:**
    ```json
    {
      "username": "your_username",
      "password": "your_password"
    }
    ```
* **Return Structure:** Standard JWT payload access/refresh sequence block.

#### `POST /api/auth/register/`
* **Access:** `AllowAny`
* **Payload Requirements:**
    ```json
    {
      "username": "example_user",
      "email": "user@domain.com",
      "password": "secure_password",
      "phone_number": "2547XXXXXXXX",
      "signup_secret": "optional_admin_token"
    }
    ```
* **Behavior:** Uses `transaction.atomic()` blocks. Passing a valid `signup_secret` programmatically flags the account context as `is_staff = True`.

---

### 2. Premium AI Operations

#### `POST /api/ai/action/`
* **Access:** `PremiumTierPermission`
* **Payload Requirements:**
    ```json
    {
      "task": "route",
      "origin": "Nairobi",
      "destination": "Mombasa",
      "vehicle_type": "SUV",
      "vehicle_make": "Range Rover Velar"
    }
    ```
* **Return Shape:**
    ```json
    {
      "estimated_distance_km": 485.5,
      "total_carbon_saved_kg": 24.3,
      "milestones": [
        {
          "mode": "driving",
          "instruction": "Depart head east via Mombasa Rd",
          "distance_km": 120.0,
          "emissions_kg": 26.4
        }
      ],
      "narrative": "Detailed routing breakdown..."
    }
    ```

---

### 3. Smart Product Scanner Ingestion

#### `POST /api/scanner/ingest/`
* **Access:** `IsAuthenticated`
* **Parsers:** `MultiPartParser`, `FormParser`, `JSONParser`
* **Payload Configurations:** Accepts a standard form-data file key containing an invoice/compliance PDF under `file`, **OR** fallback string keys `qr_payload` / `product_name`.
* **Return Status Example:**
    ```json
    {
      "product_name": "Extracted Item Name",
      "calculated_footprint_kg": 12.5,
      "offset_cost_kes": 187,
      "user_metrics": {
        "current_month_total": 142.3,
        "monthly_budget": 300.0
      },
      "advisory_status": {
        "tier": "GREEN",
        "message": "Safe Choice: This fits perfectly inside your active budget parameters."
      }
    }
    ```
    * *Advisory Evaluation Tiers:* `GREEN` (Within parameters), `YELLOW` (Target exceeded, bridgeable with purchaseable credits), `RED` (Massive budget overshoot).

---

### 4. Voice Processing Engine

#### `POST /api/voice/log/`
* **Access:** `IsAuthenticated`
* **Payload Requirements:** `multipart/form-data` containing binary audio tracked inside the `file` key parameter.
* **Route Fork Options:**
    * **Fork A (`intent: "route"`):** Returns a specialized command flag `FORWARD_TO_ROUTE_PLANNER` detailing inferred coordinates.
    * **Fork B (`intent: "log"`):** Instantly builds and commits a structured database profile to the `ActivityLog` table.

---

### 5. Fintech & Carbon Settlement Pipeline

#### `POST /api/payment/checkout/`
* **Access:** `IsAuthenticated`
* **Payload Requirements:**
    ```json
    {
      "phone_number": "2547XXXXXXXX" 
    }
    ```
* **Behavior:** Triggers a fixed standard transaction push of **KES 5.00** using local system tools. Ensures strict compliance with local provider phone standards before processing transactions.

#### `POST /api/payment/callback/`
* **Access:** `AllowAny`
* **Behavior:** Dedicated webhook receiver processing payment flags. If an environmental offset query contains parameter indicators (such as `offset_kg`), it programmatically executes an upstream call to Carbonmark's global ledger engine (`VCS-981` tracking code) using the user's secure account context.

---

### 6. Aggregates & Admin Dashboards

#### `/api/complaints/`
* **GET:** Restricted to `IsSystemAdmin` (`is_staff`). Returns complete global system feedback reports.
* **POST:** Accessible to any authentic `IsAuthenticated` profile to route and log new complaints.

---

##  Required Environment Configuration

Create a local `.env` configuration template in your workspace root directory containing the following asset indices:

```env
# Core Django Config
SECRET_KEY=your_django_secret_key
DEBUG=True

# AI Infrastructure
GROQ_API_KEY=gsk_your_live_groq_production_key

# Safaricom M-Pesa Integration Config
MPESA_ENVIRONMENT=sandbox  # Or 'production'
MPESA_EXPRESS_SHORTCODE=174379

# Climate Offsets Integration
CARBONMARK_API_KEY=your_carbonmark_api_integration_token