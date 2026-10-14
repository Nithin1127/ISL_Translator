# Indian Sign Language (ISL) Translator Web Portal

A full-stack educational and accessibility web platform that translates Indian Sign Language (ISL) gestures into real-time text using computer vision (MediaPipe) and machine learning.

---

## 🏛 System Architecture

The project consists of three decoupled microservices:

1. **`client/` (Frontend)**: React 18 powered by Vite. Provides the webcam interface, real-time status monitor, and sign prediction cards.
2. **`server/` (Backend Gateway)**: Node.js & Express.js. Manages user authentication (JWT), translation history persistence (MongoDB via Mongoose), and proxies inference requests to the Python microservice.
3. **`ai-service/` (AI/Computer Vision Microservice)**: Python with FastAPI. Performs hand detection, landmark coordinate extraction (MediaPipe Hands), and gesture classification (Scikit-Learn).

---

## 📂 Project Structure

```text
ISL_Translator/
├── client/                          # React + Vite Frontend
│   ├── src/
│   │   ├── components/              # UI Components (WebcamCapture, Cards)
│   │   ├── context/                 # State Contexts (Auth)
│   │   ├── pages/                   # Views (Home, Translator, History)
│   │   ├── services/                # API client (Axios)
│   │   ├── styles/                  # Clean modern CSS
│   │   ├── App.jsx                  # Main App & Service Health Monitor
│   │   └── main.jsx                 # React root mount
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── server/                          # Node.js + Express Backend Gateway
│   ├── src/
│   │   ├── config/                  # DB configuration (db.js)
│   │   ├── controllers/             # Request handlers
│   │   ├── middleware/              # JWT auth & error handlers
│   │   ├── models/                  # Mongoose models (User, History)
│   │   ├── routes/                  # Route handlers (healthRoutes, etc.)
│   │   ├── services/                # aiService client (REST call to FastAPI)
│   │   └── server.js                # Express app entry point
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── ai-service/                      # Python MediaPipe & ML Service
│   ├── app/
│   │   ├── api/                     # REST API endpoints
│   │   ├── core/                    # App configuration (Pydantic Settings)
│   │   ├── ml/                      # MediaPipe engine & ML classifier
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   └── main.py                  # FastAPI application entry point
│   ├── training/                    # Offline data collection & training scripts
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 How to Run Each Service Independently

### 1. Python AI Service (`ai-service/`)
Requires Python 3.10+:

```bash
# Navigate to ai-service directory
cd ai-service

# (Recommended) Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI service
python app/main.py
```
- **Live Service URL**: `http://127.0.0.1:8000`
- **Health Check**: `http://127.0.0.1:8000/health`
- **Interactive API Docs (Swagger UI)**: `http://127.0.0.1:8000/docs`

---

### 2. Node.js Backend Gateway (`server/`)
Requires Node.js 18+:

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Run in development mode (auto-reload on change)
npm run dev
# Or run standard start
npm start
```
- **Live Gateway URL**: `http://localhost:5000`
- **Backend Health Check**: `http://localhost:5000/api/health`
- **AI Microservice Bridge Test**: `http://localhost:5000/api/health/ai`

> **Note on MongoDB**: If MongoDB is not yet running on your machine, the backend will still boot and serve all non-database endpoints cleanly with an informative console log.

---

### 3. React Frontend (`client/`)
Requires Node.js 18+:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- **Live Frontend URL**: `http://localhost:5173`

---

## 🧪 Phase 1 Health Check Endpoints

| Service | Method | URL | Description |
| :--- | :--- | :--- | :--- |
| **Node.js Gateway** | `GET` | `/api/health` | Returns Node.js uptime, server status, and MongoDB connection state |
| **REST Bridge** | `GET` | `/api/health/ai` | Node.js gateway internally queries Python FastAPI over REST |
| **Python AI Service** | `GET` | `/health` | Returns Python microservice health and environment status |
| **Python AI Docs** | `GET` | `/docs` | Auto-generated OpenAPI / Swagger documentation |
| **Python Prediction Stub**| `POST` | `/predict` | Placeholder inference endpoint accepting base64 frame payload |
