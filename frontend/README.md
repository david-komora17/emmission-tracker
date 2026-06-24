#  Climatiqa API

A Django REST API for carbon footprint tracking with AI-powered route planning and M-Pesa payment integration.

---

##  Purpose

Climatiqa helps users track, reduce, and offset their carbon footprint through intelligent route planning, product carbon scanning, and voice-enabled activity logging.

---

##  Tech Stack

| Category | Technology |
|----------|------------|
| **Backend** | Django, Django REST Framework |
| **Database** | PostgreSQL |
| **AI/ML** | Groq API (Llama 3.1, Whisper) |
| **Payments** | M-Pesa API (Safaricom) |
| **Carbon Offsets** | Carbonmark API |
| **Authentication** | JWT (SimpleJWT) |
| **Caching** | Redis |
| **PDF Processing** | PyPDF2 |
| **Deployment** | Docker, Gunicorn |

---

##  Core Features

- **AI Route Planning** – Calculate carbon-efficient routes with emission estimates
- **Voice Logging** – Speech-to-text transcription for hands-free activity tracking
- **Product Scanner** – Upload PDFs or QR codes to get instant carbon footprints
- **M-Pesa Payments** – Premium subscriptions and carbon offset purchases
- **Carbon Dashboard** – Real-time emissions tracking with historical activity logs
- **User Tiers** – Free, Premium, and Enterprise with different AI query limits

---

##  Key Integrations

- **Groq** – Route calculations, carbon estimates, and voice transcription
- **Safaricom M-Pesa** – STK Push payments and callback handling
- **Carbonmark** – Direct carbon credit retirements
- **JWT** – Secure authentication and session management

---

##  Database Structure

- **UserProfile** – User preferences, tier, budget, and payment tracking
- **ActivityLog** – Carbon impact records (emissions/savings)
- **SystemComplaint** – User feedback and support tickets
- **RouteSearchLog** – AI route query history

---

##  Quick Start

```bash
# Setup
git clone <repository>
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
# Add your API keys and credentials

# Run
python manage.py migrate
python manage.py runserver
```

---

##  Environment Variables

```env
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
GROQ_API_KEY=your-groq-key
MPESA_CONSUMER_KEY=your-mpesa-key
MPESA_CONSUMER_SECRET=your-mpesa-secret
CARBONMARK_API_KEY=your-carbonmark-key
```

---

##  Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login/` | User login |
| `POST` | `/api/auth/register/` | User registration |
| `GET` | `/api/dashboard/` | User dashboard |
| `POST` | `/api/premium-ai/` | AI route planning |
| `POST` | `/api/voice-log/` | Voice activity logging |
| `POST` | `/api/product-scan/` | Product carbon scanning |
| `POST` | `/api/mpesa/checkout/` | M-Pesa payment |
| `POST` | `/api/mpesa/callback/` | M-Pesa webhook |
| `POST` | `/api/complaints/` | Submit complaint |

---

##  License

MIT