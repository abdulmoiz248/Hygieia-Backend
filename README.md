<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

# Hygieia — Backend

**Hygieia** is a microservice-based healthcare platform backend that centralizes patient services including authentication, appointments, lab workflows, fitness tracking, medication adherence, AI-powered recommendations, and automated notifications.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Services](#services)
  - [API Gateway](#1-api-gateway)
  - [Auth Microservice](#2-auth-microservice)
  - [Appointments Service](#3-appointments-service)
  - [Lab Service](#4-lab-service)
  - [Fitness Service](#5-fitness-service)
  - [Admin Service](#6-admin-service)
  - [Scheduler Service](#7-scheduler-service)
  - [Mailer Service](#8-mailer-service)
  - [Embeddings Service](#9-embeddings-service-python)
  - [Recommendations Service](#10-recommendations-service-python)
- [Infrastructure](#infrastructure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Cron Jobs & Scheduled Tasks](#cron-jobs--scheduled-tasks)
- [AI & ML Models](#ai--ml-models)
- [CI/CD](#cicd)
- [Port Reference](#port-reference)
- [Documentation](#documentation)

---

## Architecture Overview

Hygieia uses a **hybrid microservice architecture** with a single API Gateway as the public entry point. Services communicate via **TCP**, **RabbitMQ**, and **HTTP** depending on the use case.

```
                          ┌─────────────────┐
                          │    Frontend      │
                          │   (Next.js)      │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  API Gateway     │
                          │  (port 4000)     │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
     ┌────────┴───────┐  ┌────────┴───────┐  ┌─────────┴──────┐
     │   NestJS TCP   │  │  HTTP / REST   │  │   RabbitMQ     │
     │   Services     │  │  Services      │  │   Consumers    │
     └────────┬───────┘  └────────┬───────┘  └────────┬───────┘
              │                    │                    │
     ┌────────┴───────┐  ┌────────┴───────┐  ┌────────┴───────┐
     │• Auth (4002)   │  │• Embeddings    │  │• Scheduler     │
     │• Lab (4003)    │  │  (4008)        │  │  (4009)        │
     │• Fitness (4005)│  │• Recommendations│ │• Mailer        │
     │• Appointments  │  │  (4012)        │  │  (4010)        │
     │  (4006)        │  │                │  │• Admin         │
     │• Admin (4011)  │  │                │  │  (4011)        │
     └────────────────┘  └────────────────┘  └────────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
              │ Supabase  │ │  MongoDB  │ │   Redis   │
              │ (Postgres)│ │           │ │  + BullMQ │
              └───────────┘ └───────────┘ └───────────┘
```

### Data Storage Strategy

| Store | Used For |
|-------|----------|
| **Supabase (Postgres)** | Users, appointments, prescriptions, fitness, lab tests, notifications, adherence records, diet plans, blog posts, FAQs |
| **MongoDB** | Patient/doctor/nutritionist profiles, chat sessions, document-style data |
| **Redis** | BullMQ job queues (appointment reminders, lab reminders) |
| **RabbitMQ** | Async event messaging between services (emails, notifications, profile sync) |
| **FAISS** | Local vector store for CV semantic search (embeddings service) |

---

## Repository Structure

```
Hygieia-Backend/
├── api-gateway/          # Public-facing REST API (NestJS)
├── auth-ms/              # Authentication & identity (NestJS)
├── appointments/         # Appointments, prescriptions, diet plans (NestJS)
├── lab/                  # Lab tests, bookings, medical records (NestJS)
├── fitness/              # Fitness & workout tracking (NestJS)
├── admin/                # Admin operations & worker reports (NestJS)
├── scheduler/            # Cron jobs, reminders, adherence sync (NestJS)
├── mailer/               # Email delivery via RabbitMQ (NestJS)
├── embeddings/           # CV embeddings & RAG search (FastAPI / Python)
├── recommendations/      # AI recommendations & chatbot (FastAPI / Python)
├── dental_model/         # Pre-trained dental classification model weights
├── models/               # Shared model artifacts
├── supabase/             # Database schema & migrations
├── scripts/              # Setup & utility scripts
├── docs/                 # Project documentation
├── .github/workflows/    # GitHub Actions CI/CD
├── docker-compose.yml    # Full orchestration
├── .mprocs.yml           # Multi-process dev runner
└── test-cron-jobs.sh     # Cron job testing utility
```

---

## Services

### 1. API Gateway

| | |
|---|---|
| **Folder** | `api-gateway/` |
| **Port** | `4000` (HTTP) |
| **Framework** | NestJS |

The single public entry point for the frontend. All client requests go through here.

**Responsibilities:**
- REST API with Swagger documentation at `/api/docs`
- Request validation and DTO transformation
- Routes requests to internal microservices via TCP, HTTP, or RabbitMQ
- CORS configuration
- Centralized authorization boundaries

**Key Gateway Modules:**

| Module | Purpose |
|--------|---------|
| `auth` | Login, registration, OAuth flows |
| `appointments` | Booking, prescriptions, medication tracking |
| `fitness` | Steps, water, sleep, calories tracking |
| `lab-tests` | Lab test catalog and management |
| `bookings` | Lab test booking workflows |
| `medical-records` | Patient medical record access |
| `diet-plan` | Nutritionist-assigned diet plans |
| `doctors` / `nutritionists` | Provider profile management |
| `blog-post` / `blog-category` | Health blog CMS |
| `newsletter` | Newsletter subscriptions & sending |
| `notifications` | In-app notification system |
| `recommendations` | AI health recommendations |
| `rag` | RAG-based question answering |
| `cv` | CV submission & semantic search |
| `workout-sessions` | Workout session logging |
| `faq` | FAQ management |
| `analytics` | Dashboard analytics |
| `cron-test` | Manual cron job triggers (dev/test) |
| `announcement` | Admin announcements |
| `patient-journal` | Patient journal entries |
| `worker-report` / `provider-report` | Provider reporting |
| `feedback-form` | Feedback collection |
| `lab-technicians` | Lab technician management |

---

### 2. Auth Microservice

| | |
|---|---|
| **Folder** | `auth-ms/` |
| **Ports** | `4001` (HTTP), `4002` (TCP) |
| **Framework** | NestJS |

**Responsibilities:**
- Email/password registration and login
- JWT access token and refresh token management
- Google OAuth 2.0 login
- Fitbit OAuth login (wearable data integration)
- Password hashing with bcrypt
- OTP verification
- User profile CRUD (MongoDB)
- Profile image uploads via Cloudinary

**Auth Strategies:** Local, JWT, Google, Fitbit (via Passport.js)

---

### 3. Appointments Service

| | |
|---|---|
| **Folder** | `appointments/` |
| **Port** | `4006` (TCP) |
| **Framework** | NestJS |

**Responsibilities:**
- Appointment booking (doctor & nutritionist)
- Appointment lifecycle: upcoming → completed / cancelled
- Prescription management (create, update, auto-complete expired)
- **Medication adherence tracking** — logs each dose taken/missed
- **Real-time adherence calculation** — recalculates on every medication action
- Diet plan management
- Appointment reviews and ratings
- Google Calendar / Zoom integration for online appointments
- Medical record linkage

---

### 4. Lab Service

| | |
|---|---|
| **Folder** | `lab/` |
| **Port** | `4003` (TCP) |
| **Framework** | NestJS |

**Responsibilities:**
- Lab test catalog management
- Lab test booking and scheduling
- Medical record creation and PDF report generation
- File uploads to Cloudinary
- Lab technician assignment

---

### 5. Fitness Service

| | |
|---|---|
| **Folder** | `fitness/` |
| **Port** | `4005` (TCP) |
| **Framework** | NestJS |

**Responsibilities:**
- Daily fitness data tracking (steps, water, sleep, calories burned/intake, macros)
- Workout session logging
- Fitbit data sync integration
- Fitness data stored in Supabase `fitness` table

---

### 6. Admin Service

| | |
|---|---|
| **Folder** | `admin/` |
| **Port** | `4011` (RabbitMQ microservice) |
| **Framework** | NestJS |

**Responsibilities:**
- Admin-facing operations (user management, announcements)
- FAQ management
- Newsletter management and sending
- Blog post verification
- CV status management (new → shortlisted → reviewed → rejected)
- Google GenAI integration for content generation

---

### 7. Scheduler Service

| | |
|---|---|
| **Folder** | `scheduler/` |
| **Port** | `4009` (HTTP + RabbitMQ) |
| **Framework** | NestJS |

The background job engine for the platform.

**Responsibilities:**
- **Appointment reminders** — 24h and 30min before (via BullMQ delayed jobs)
- **Lab booking reminders** — same schedule as appointments
- **Patient adherence sync** — recalculates adherence for all patients every 10 minutes
- **Weekly nutrition summary emails** — every Monday at 9:00 AM UTC
- **Monthly adherence tracking** — 1st of each month, stores composite health scores
- **Daily medicine reminders** — emails patients about upcoming medications
- **Appointment/cancellation/reschedule notification dispatch**
- **Fitbit token refresh** — keeps wearable data flowing

---

### 8. Mailer Service

| | |
|---|---|
| **Folder** | `mailer/` |
| **Port** | `4010` (RabbitMQ consumer) |
| **Framework** | NestJS |

**Responsibilities:**
- Consumes email jobs from the `email_queue` RabbitMQ queue
- Sends transactional emails via SMTP (Nodemailer)
- Handles: appointment reminders, nutrition summaries, medicine reminders, newsletters, OTP emails
- Email template rendering
- Email preview support for development

---

### 9. Embeddings Service (Python)

| | |
|---|---|
| **Folder** | `embeddings/` |
| **Port** | `4008` (HTTP) |
| **Framework** | FastAPI |

**Responsibilities:**
- CV text extraction and embedding generation
- Vector storage and search using FAISS
- Semantic search over indexed CV data
- RAG-style question answering using Groq LLM
- Sentence Transformers (`all-MiniLM-L6-v2`) for embeddings

---

### 10. Recommendations Service (Python)

| | |
|---|---|
| **Folder** | `recommendations/` |
| **Port** | `4012` (HTTP) |
| **Framework** | FastAPI |

**Responsibilities:**
- **Personalized health recommendations** generated daily via APScheduler
- **Patient chatbot** powered by LangGraph + Groq (with tool-calling support)
- **Acne detection** — image classification from uploaded photos
- **Dental condition detection** — X-ray classification using EfficientNet-B3 (6 classes: BDC-BDR, Caries, Fractured Teeth, Healthy Teeth, Impacted Teeth, Infection)
- Recommendation storage in Supabase
- Chat session persistence in MongoDB

---

## Infrastructure

### RabbitMQ
- **Image:** `rabbitmq:3-management`
- **AMQP Port:** `5672`
- **Management UI:** `http://localhost:15672` (guest/guest)
- **Queues:** `email_queue`, service-to-service event messaging

### Redis
- **Image:** `redis:7`
- **Port:** `6379`
- **Used by:** BullMQ for delayed job processing (appointment & lab reminders)

### Docker Compose
The `docker-compose.yml` orchestrates all 10 services plus RabbitMQ and Redis on a shared `hygieia-network` bridge network.

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend Frameworks** | NestJS (Node.js), FastAPI (Python) |
| **Languages** | TypeScript, Python |
| **Databases** | Supabase (PostgreSQL), MongoDB |
| **Message Broker** | RabbitMQ (AMQP) |
| **Job Queue** | BullMQ + Redis |
| **Authentication** | JWT, Passport.js, Google OAuth 2.0, Fitbit OAuth |
| **AI/ML** | Groq (LLM), LangGraph, Sentence Transformers, FAISS, PyTorch, EfficientNet |
| **Email** | Nodemailer (SMTP) |
| **File Storage** | Cloudinary |
| **Video Calls** | Zoom API |
| **Calendar** | Google Calendar API |
| **PDF Generation** | PDFKit, jsPDF |
| **Containerization** | Docker, Docker Compose |
| **API Docs** | Swagger / OpenAPI |
| **CI/CD** | GitHub Actions |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Docker** & **Docker Compose**
- **npm**
- A running **MongoDB** instance
- A **Supabase** project (with schema applied)

### Installation

**1. Clone the repository:**

```bash
git clone https://github.com/abdulmoiz248/Hygieia-Backend.git
cd Hygieia-Backend
```

**2. Install all dependencies (Node + Python):**

```bash
bash scripts/install-all-deps.sh
```

This script automatically:
- Runs `npm install` in every Node.js service
- Creates a `.venv` and installs `requirements.txt` in every Python service

**3. Set up environment variables:**

Copy the example `.env` file and fill in your credentials:

```bash
cp .env.example .env
```

Each service also has its own `.env` file. You can use the helper script:

```bash
bash scripts/create-env-all.sh
```

**4. Start infrastructure (RabbitMQ + Redis):**

```bash
docker run -d --hostname my-rabbit --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name bullmq-redis -p 6379:6379 redis:7
```

**5. Apply database schema:**

Apply the base schema and migrations to your Supabase project from `supabase/schema.sql` and `supabase/migrations/`.

### Running the Project

#### Option 1: Docker Compose (Recommended)

Starts everything — all services, RabbitMQ, and Redis:

```bash
docker compose up --build
```

#### Option 2: mprocs (Dev — Core Services Only)

Runs the 5 core Node services in a single terminal with a TUI:

```bash
npm run start:dev
```

This uses `.mprocs.yml` which starts: `api-gateway`, `auth-ms`, `lab`, `fitness`, `appointments`.

> **Note:** You still need RabbitMQ, Redis, scheduler, mailer, and Python services running separately.

#### Option 3: Separate Terminals

```bash
npm run start:separate    # Start all services in separate terminals
npm run stop:separate     # Stop all
```

#### Running Individual Services

```bash
# Node services
cd api-gateway && npm run start:dev

# Python services
cd embeddings && source .venv/bin/activate && uvicorn main:app --port 4008 --reload
cd recommendations && source .venv/bin/activate && uvicorn main:app --port 4012 --reload
```

---

## Environment Variables

Key environment variables across the project (see `.env.example` for the full list):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES` | JWT token expiry |
| `REFRESH_SECRET` | Refresh token secret |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect URI |
| `FITBIT_CLIENT_ID` / `FITBIT_CLIENT_SECRET` | Fitbit OAuth credentials |
| `SMTP_EMAIL` / `SMTP_PASSWORD` | SMTP credentials for email |
| `MAIL_HOST` / `MAIL_PORT` | SMTP server config |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary media storage |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | Zoom integration |
| `GROQ_API_KEY` | Groq LLM API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `HUGGINGFACE_API_KEY` | HuggingFace API key |
| `QDRANT_URL` / `QDRANT_API_KEY` | Qdrant vector DB (if used) |
| `EMBEDDINGS_SERVICE_URL` | Internal URL for embeddings service |
| `RECOMMENDATIONS_SERVICE_URL` | Internal URL for recommendations service |

---

## Database

### Supabase (PostgreSQL)

The full schema is defined in `supabase/schema.sql`. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts (email, password, role, OTP) |
| `appointments` | Doctor/nutritionist appointments |
| `prescriptions` | Medication prescriptions (JSONB medications array) |
| `medication_adherence_logs` | Per-dose medication tracking |
| `adherence_monthly_records` | Monthly adherence & health score snapshots |
| `diet_plan` | Nutritionist-assigned diet plans |
| `fitness` | Daily fitness metrics |
| `lab_tests` | Lab test catalog |
| `booked_lab_tests` | Patient lab bookings |
| `medical_records` | Lab results, scans, reports |
| `notifications` | In-app notifications |
| `blogpost` / `blogcategory` | Health blog content |
| `newsletter` | Newsletter subscribers |
| `sent_newsletters` | Newsletter delivery history |
| `appointment_reviews` | Patient reviews & ratings |
| `patient_recommendations` | AI-generated recommendations |
| `cv` | Professional CV submissions |
| `faqs` | Frequently asked questions |
| `fitbit_tokens` | Fitbit OAuth token storage |
| `workout_sessions` | Workout session logs |

### Migrations

SQL migrations are tracked in `supabase/migrations/` and should be applied in chronological order.

### MongoDB Collections

- `patient_profiles` — Patient health metrics, adherence scores
- `doctor_profiles` — Doctor working hours, specializations
- `nutritionist_profiles` — Nutritionist details
- `lab_technician_profiles` — Lab tech details
- `chat_sessions` — Chatbot conversation history

---

## API Documentation

Swagger/OpenAPI documentation is available at:

```
http://localhost:4000/api/docs
```

This is auto-generated from the API Gateway controllers and DTOs.

---

## Cron Jobs & Scheduled Tasks

| Job | Schedule | Service | Description |
|-----|----------|---------|-------------|
| **Patient Adherence Sync** | Every 10 minutes | Scheduler | Recalculates adherence % for all patients |
| **Weekly Nutrition Summary** | Monday 9:00 AM UTC | Scheduler | Emails weekly fitness stats to patients |
| **Monthly Adherence Tracking** | 1st of month 00:00 UTC | Scheduler | Stores monthly adherence + health score |
| **Daily Medicine Reminders** | Daily 5:00 AM UTC | Scheduler | Queues medicine reminder emails |
| **Daily Recommendations** | Daily (configurable) | Recommendations | Generates AI recommendations per patient |
| **Fitbit Token Refresh** | Periodic | Scheduler | Refreshes expiring Fitbit OAuth tokens |

### Testing Cron Jobs

Use the interactive test script:

```bash
bash test-cron-jobs.sh
```

Or hit the test endpoints directly:

```bash
# Test weekly nutrition summary
curl -X POST http://localhost:4000/admin/cron-test/nutrition-summary

# Test monthly adherence
curl -X POST http://localhost:4000/admin/cron-test/monthly-adherence

# Test medicine reminders
curl -X POST http://localhost:4000/admin/cron-test/medicine-reminders

# Test all cron jobs
curl -X POST http://localhost:4000/admin/cron-test/all
```

---

## AI & ML Models

### Dental Condition Classification

- **Architecture:** EfficientNet-B3 (fine-tuned)
- **Classes:** BDC-BDR, Caries, Fractured Teeth, Healthy Teeth, Impacted Teeth, Infection
- **Input:** 224×224 dental X-ray images
- **Weights:** `dental_model/dental_model_weights.pth`
- **Dataset:** `imtkaggleteam/dental-opg-xray-dataset`

### Acne Detection

- **Weights:** `dental_model/best_model.pth`
- **Input:** Uploaded skin images

### Patient Chatbot

- **Orchestration:** LangGraph
- **LLM:** Groq (Llama 3.1 8B)
- **Tools:** Can query patient data, fitness, appointments, prescriptions via API Gateway
- **Sessions:** Persisted in MongoDB

### CV Semantic Search

- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **Vector Store:** FAISS (local)
- **RAG:** Groq-powered question answering over indexed CVs

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `insert-fitness-today.yml` | Scheduled | Inserts daily fitness test data |
| `scheduled-data-check.yml` | Scheduled | Validates data integrity |

---

## Port Reference

| Service | Protocol | Port |
|---------|----------|------|
| API Gateway | HTTP | `4000` |
| Auth (HTTP) | HTTP | `4001` |
| Auth (TCP) | TCP | `4002` |
| Lab | TCP | `4003` |
| Fitness | TCP | `4005` |
| Appointments | TCP | `4006` |
| Embeddings | HTTP | `4008` |
| Scheduler | HTTP + RMQ | `4009` |
| Mailer | RMQ | `4010` |
| Admin | RMQ | `4011` |
| Recommendations | HTTP | `4012` |
| RabbitMQ (AMQP) | AMQP | `5672` |
| RabbitMQ (Management UI) | HTTP | `15672` |
| Redis | TCP | `6379` |

---

## Documentation

Additional documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [Adherence Rate](docs/adherence-rate.md) | How medication adherence percentage is calculated |
| [Health Score](docs/health-score.md) | How the composite health score is computed |

---

<p align="center">
  <sub>Built as a Final Year Project — <b>Hygieia Healthcare Platform</b></sub>
</p>
