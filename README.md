# emmission-tracker
Creating a final capstone project that entails an emmision tracker

FINAL CAPSTONE PROJECT PROPOSAL
    Project Overview
EcoTrack is a SaaS-based Carbon Footprint Tracker that calculates, monitors, and analyzes greenhouse gas emissions caused by an individual's daily activities. The platform has a list of advanced features as below

    What It Should Do (Core Functions)

•	Log Tier-Restricted Daily Activities: Users input data across permitted emission categories based on their plan: transportation (car mileage, flights), home energy (electricity, gas bills), and diet (meat consumption).
•	Synchronous Carbon Equivalent (CO2e) Calculations: The application converts activities into kilograms or metric tons of CO2e instantly upon form submission.
•	Fetch Real-Time Environmental Data: The Django backend securely makes HTTP requests to the Carbon Interface API to get certified, up-to-date conversion factors.
•	Aggregate and Visualize Trends: The system stores entries over time. Django's ORM runs aggregation queries to calculate weekly, monthly, and yearly totals.
•	Provide Reduction Targets: Premium users set environmental goals (e.g., "Reduce transport emissions by 15% this month") and track their real-time progress.

    How It Should Behave (System Logic & UX)

•	Synchronous State Loading UX: When a user logs an activity, the frontend shows an active loading spinner while the Django backend executes the live external API call, updating the UI smoothly once data returns.
•	Dynamic, Responsive Visuals: The dashboard UI instantly updates its charts (via Recharts or Chart.js) as soon as a new activity is logged, without requiring a full page refresh.
•	Smart Defaults: To minimize user friction, the database stores default regional averages. If a user does not know their exact electricity usage, the app autofills an estimate based on their country or county.
•	Gamified Feedback: The interface uses clear visual cues. It displays green badges when a user stays below their daily target, and switches to amber or red alerts when they exceed it.
•	Secure and Isolated Data: Users only see their own logs. The Django REST Framework handles this by enforcing strict object-level permissions (IsAuthenticated paired with custom ownership checking filters).

    Technical Ecosystem Stack
Frontend (User Interface)
•	React.js: Single-page application framework for driving the reactive, state-driven user dashboard.
•	Tailwind CSS: For fast, responsive, mobile-friendly interface styling.
•	Chart.js / Recharts: Lightweight JavaScript data-visualization libraries for carbon emission tracking graphs.
Backend & Database
•	Django & Django REST Framework (DRF): To build the secure monolithic REST API, manage user authentication (JWT), handle plan validation logic, and query statistics.
•	PostgreSQL: Relational database to store user records, M-Pesa transaction tables, subscription states, and activity logs.
Third-Party APIs & Services
•	Carbon Interface API (or Climatiq): External environmental API to calculate carbon coefficients for flights, vehicles, and electricity usage.

    DevOps & Deployment
•	Render / Railway: Cloud application platforms to host the live, working frontend and backend web services for presentation day.
