+# Hygieia Backend Overview

## 1. What this project is

Hygieia Backend is a healthcare-oriented backend system built as a **microservice architecture**. It is designed to support a patient platform with:

- authentication and user management
- appointments and bookings
- fitness and workout tracking
- lab test and medical record workflows
- email notifications and reminders
- newsletters, FAQs, blogs, and announcements
- AI-assisted recommendations and chat
- CV processing and semantic search for medical or candidate data
- admin-facing management features

The main reason for splitting the backend into multiple services is to keep each business area independent. That makes the system easier to maintain, test, deploy, and scale. For example, the recommendation engine can be updated without touching the authentication service, and notification jobs can run separately from the API layer.

---

## 2. High-level architecture

The project uses a **hybrid microservice architecture**:

- **API Gateway**: single entry point for frontend clients
- **Domain microservices**: focused services for specific business domains
- **Python AI services**: FastAPI services for embeddings and recommendations
- **Infrastructure services**: RabbitMQ, Redis, MongoDB, Supabase, Docker

### Main request flow

1. The frontend talks to the **API Gateway**.
2. The gateway forwards requests to the correct microservice.
3. Some services talk to each other through **TCP** or **RabbitMQ**.
4. Background jobs and scheduled tasks are handled by the **Scheduler** and **Mailer**.
5. Data is stored in different backends depending on the use case:
   - **Supabase** for app data and shared tables
   - **MongoDB** for document-style data and chats
   - **Redis** for queue/state support
   - **RabbitMQ** for messaging between services
   - **FAISS / local model files** for embeddings and ML assets

---

## 3. Why microservices are used

Microservices are used here because the project is not a single simple CRUD app. It has many independent domains:

- user login and OAuth
- appointment booking
- health tracking
- email delivery
- scheduled reminders
- AI recommendation generation
- semantic search for CVs

A monolith would become harder to manage as the project grows. With microservices:

- each team member can work on a separate service
- failures in one service are less likely to break everything
- different services can use different technologies when needed
- scaling can be done per service instead of for the whole backend

---

## 4. Services in the repository

## 4.1 API Gateway

**Folder:** [api-gateway](api-gateway)

The API Gateway is the public-facing entry point of the backend. The frontend should call this service instead of calling the internal services directly.

### What it does

- exposes the main REST API
- routes requests to internal services
- provides Swagger documentation at `/api/docs`
- enables CORS for the frontend
- centralizes request validation and authorization boundaries

### Why it exists

- hides internal service structure from the frontend
- keeps the frontend simple
- allows internal services to be changed without breaking client code
- gives one place for API documentation and request coordination

### Key tech used

- **NestJS**: structured Node.js backend framework
- **Swagger**: API documentation
- **Axios**: HTTP forwarding to other services
- **Supabase JS**: shared data access where needed
- **Microservices module**: supports TCP/RabbitMQ communication patterns
- **Class Validator / Transformer**: DTO validation

### Main port

- `4000`

---

## 4.2 Auth microservice

**Folder:** [auth-ms](auth-ms)

This service manages authentication and identity-related features.

### What it does

- login and registration flows
- JWT-based authentication
- Google OAuth login
- Fitbit OAuth login
- password hashing and user sessions
- cookie handling
- cron and schedule support for auth-related tasks
- cloud file support through Cloudinary where needed

### Why it exists

Authentication is security-sensitive and should be isolated from business logic. Keeping it in its own service makes token handling, OAuth, and user identity easier to protect and maintain.

### Key tech used

- **NestJS** for service structure
- **JWT** for access tokens
- **Passport** strategies for local, Google, JWT, and Fitbit auth
- **Mongoose / MongoDB** for document storage
- **Supabase** for shared user data in some flows
- **RabbitMQ** for async messaging
- **Node-cron / Nest Schedule** for periodic jobs
- **bcrypt** for password hashing
- **Cloudinary** for media-related auth or profile flows

### Main ports

- HTTP: `4001`
- TCP microservice: `4002`

---

## 4.3 Appointments service

**Folder:** [appointments](appointments)

This service handles appointment-related business logic.

### What it does

- booking appointments
- appointment lifecycle operations
- interaction with medical records and lab tests
- sending notification or mail-related events

### Why it exists

Appointments are one of the main healthcare workflows and need their own service because they involve multiple dependencies and can grow independently.

### Key tech used

- **NestJS**
- **MongoDB / Mongoose**
- **Supabase**
- **RabbitMQ** and **TCP** for inter-service communication
- **Nodemailer** for emails
- **Google APIs** and **Google auth library** for calendar or Google-based integrations

### Main port

- TCP microservice: `4006`

---

## 4.4 Lab service

**Folder:** [lab](lab)

This service manages lab-related functionality.

### What it does

- lab bookings and lab workflows
- lab test management
- medical record integration
- document generation and file handling

### Why it exists

Lab features are separate from appointments and fitness, and they often need specific data handling and file output.

### Key tech used

- **NestJS**
- **MongoDB / Mongoose**
- **Supabase**
- **RabbitMQ**
- **Cloudinary** for uploads
- **Multer** for file uploads
- **PDFKit** and **jsPDF** for PDF generation
- **UUID** for unique identifiers

### Main port

- TCP microservice: `4003`

---

## 4.5 Fitness service

**Folder:** [fitness](fitness)

This service covers fitness-related tracking.

### What it does

- workout session management
- fitness tracking features
- fitness-specific data storage and APIs

### Why it exists

Fitness data is a separate domain from appointments or lab work. Splitting it keeps the system cleaner and easier to expand.

### Key tech used

- **NestJS**
- **Supabase**
- **Class Validator** for request validation
- **TCP microservice** communication

### Main port

- TCP microservice: `4005`

---

## 4.6 Admin service

**Folder:** [admin](admin)

This service appears to handle administrative operations and internal worker-style functionality.

### What it does

- admin-facing workflows
- message-driven tasks
- interaction with announcements, FAQ, newsletters, and worker reports

### Why it exists

Admin operations should not be mixed with patient-facing logic. This keeps privileged tasks separate and allows internal tooling to evolve independently.

### Key tech used

- **NestJS**
- **RabbitMQ** for messaging
- **Supabase**
- **Google GenAI** integration
- **Class Validator / Transformer**

### Runtime note

The code currently sets up the admin app mainly as a microservice-oriented Nest application. The container exposes port `4011`, but the startup file does not call `listen()`, so it should be treated as an internal service rather than a typical public HTTP API unless additional code is added later.

### Main port

- `4011`

---

## 4.7 Mailer service

**Folder:** [mailer](mailer)

This service is dedicated to sending emails.

### What it does

- processes email jobs from RabbitMQ
- sends notification emails
- supports email previewing for development

### Why it exists

Email delivery should not block user requests. Moving it to a dedicated service allows asynchronous delivery and easier retry handling.

### Key tech used

- **NestJS**
- **RabbitMQ** queue consumer
- **Nodemailer** for SMTP email sending
- email preview scripts for local testing

### Main port

- `4010`

### Important runtime behavior

This service is started as an **RMQ microservice** and listens to the `email_queue` queue.

---

## 4.8 Scheduler service

**Folder:** [scheduler](scheduler)

This service manages scheduled and background operations.

### What it does

- scheduled reminders
- cron-triggered workflows
- queue-based processing with BullMQ
- triggering appointments or other reminder-related jobs

### Why it exists

Scheduled tasks should not run inside the gateway. Putting them in a dedicated scheduler makes periodic work reliable and easier to monitor.

### Key tech used

- **NestJS Schedule** for cron jobs
- **BullMQ** for job queues
- **Redis** as the queue backend
- **RabbitMQ** for message delivery to other services
- **Node-cron** for time-based jobs

### Main port

- HTTP: `4009`
- RabbitMQ microservice: same service, queue-based

---

## 4.9 Embeddings service

**Folder:** [embeddings](embeddings)

This is a **FastAPI** service written in Python.

### What it does

- generates embeddings for CVs
- stores and searches vectors locally using FAISS
- performs semantic search over indexed CV data
- provides RAG-style question answering using Groq

### Why it exists

Embedding and retrieval workloads are better handled in Python because the ML ecosystem is stronger there. It also keeps AI-specific logic separate from the main NestJS codebase.

### Key tech used

- **FastAPI** for the HTTP API
- **Sentence Transformers** for text embeddings
- **FAISS** for vector search
- **Groq** for LLM-powered RAG answers
- **Pydantic** for request/response validation

### Main port

- `4008`

---

## 4.10 Recommendations service

**Folder:** [recommendations](recommendations)

This is another **FastAPI** service in Python.

### What it does

- generates personalized patient recommendations
- runs scheduled recommendation jobs
- stores recommendation results in Supabase
- serves a patient chatbot powered by LangGraph and Groq
- predicts acne and dental conditions from uploaded images

### Why it exists

This service handles AI-heavy tasks and scheduled model-based workflows. Keeping them separate avoids slowing down the main API and makes ML deployment easier.

### Key tech used

- **FastAPI** for HTTP endpoints
- **LangGraph** for chatbot and workflow orchestration
- **Groq** for LLM inference
- **Supabase** for storing recommendation records and chat data
- **APScheduler** for daily scheduled generation
- **PyTorch model artifacts** downloaded from Google Drive
- **MongoDB** for chat sessions and history
- **HTTP calls to the API Gateway** for live tool access

### Main port

- `4012`

---

## 4.11 Core gateway subdomains

Inside the API Gateway, the code is organized into domain folders such as:

- `auth`
- `appointments`
- `fitness`
- `lab-tests`
- `medical-records`
- `blog-post`
- `blog-category`
- `newsletter`
- `notifications`
- `doctors`
- `faq`
- `patient-journal`
- `analytics`
- `diet-plan`
- `cv`
- `workout-sessions`
- `recommendations`
- `rag`
- `worker-report`
- `lab-technicians`
- `cron-test`
- `announcement`
- `bookings`

These folders are the gateway-side controllers and adapters that connect the frontend to the internal services.

---

## 5. Tech stack explanation

## NestJS

Used across most Node.js services.

### Why

- strong structure for enterprise backends
- built-in support for modules, controllers, providers, and dependency injection
- good for microservices
- easy integration with validation, testing, queues, and transports

### Where

- API Gateway
- Auth service
- Admin service
- Appointments service
- Lab service
- Fitness service
- Mailer service
- Scheduler service

---

## FastAPI

Used for the ML/AI services.

### Why

- very fast to develop in Python
- excellent for AI and ML workflows
- good async support
- natural fit for model inference and RAG endpoints

### Where

- [embeddings](embeddings)
- [recommendations](recommendations)

---

## RabbitMQ

Used for asynchronous message passing.

### Why

- decouples services
- prevents user requests from waiting on slow work
- useful for email, reminders, and event-driven flows

### Where

- auth-ms
- admin
- appointments
- lab
- scheduler
- mailer
- API Gateway references internal messaging configuration

---

## Redis / BullMQ

Used for queue processing and background jobs.

### Why

- reliable delayed jobs and job queues
- ideal for reminders and scheduled tasks

### Where

- scheduler
- auth-ms
- docker-compose includes `bullmq-redis`

---

## MongoDB / Mongoose

Used for document-based storage.

### Why

- flexible schema for chat histories, auth-related records, and dynamic medical workflows
- good fit for JSON-like healthcare data

### Where

- auth-ms
- appointments
- lab
- recommendations
- scheduler uses Mongo-backed features indirectly in some workflows

---

## Supabase

Used as a cloud backend for shared data storage and service integration.

### Why

- managed Postgres-style backend
- useful for application records, user tables, and shared entities
- simpler than maintaining everything manually

### Where

- api-gateway
- admin
- appointments
- lab
- fitness
- scheduler
- recommendations
- auth-ms

---

## Swagger

Used to document the API.

### Why

- helps demo the backend
- helps the frontend team understand endpoints
- useful for evaluation and testing

### Where

- API Gateway at `/api/docs`

---

## Passport

Used for authentication strategies.

### Why

- supports local login, JWT, Google OAuth, and Fitbit OAuth in a consistent way

### Where

- auth-ms

---

## Nodemailer

Used for SMTP email sending.

### Why

- simple and reliable email delivery
- integrates well with queue-based mail sending

### Where

- mailer
- auth-ms
- appointments
- lab

---

## Cloudinary

Used for media storage.

### Why

- good for image and file uploads
- offloads file storage from the app servers

### Where

- auth-ms
- lab
- appointments

---

## Google APIs / Google OAuth

Used for Google-based login and calendar/service integrations.

### Why

- useful for user sign-in and calendar workflows

### Where

- auth-ms
- appointments

---

## Groq

Used for LLM inference.

### Why

- fast hosted model access
- powers recommendation generation, RAG, and chatbot responses

### Where

- embeddings
- recommendations
- admin may use GenAI-related workflows

---

## LangGraph

Used for AI workflow orchestration.

### Why

- good for multi-step chatbot flows
- supports tool use and stateful dialogue

### Where

- recommendations chatbot

---

## Docker and Docker Compose

Used for local orchestration.

### Why

- starts all services in a repeatable way
- creates shared network and shared infrastructure containers
- simplifies evaluation setup

### Where

- root [docker-compose.yml](docker-compose.yml)

---

## 6. Local development setup

There are multiple ways to run the project:

### Option 1: Run selected Node services with mprocs

The root `.mprocs.yml` starts the main Node services:

- api-gateway
- auth-ms
- lab
- fitness
- appointments

### Option 2: Run services separately

The repository includes scripts to start and stop services in separate terminals.

### Option 3: Use Docker Compose

This is the most complete setup because it starts:

- all app services
- RabbitMQ
- Redis
- shared networking

---

## 7. Ports summary

| Service | Type | Port |
|---|---:|---:|
| API Gateway | HTTP | 4000 |
| Auth | HTTP | 4001 |
| Auth microservice | TCP | 4002 |
| Lab microservice | TCP | 4003 |
| Fitness microservice | TCP | 4005 |
| Appointments microservice | TCP | 4006 |
| Embeddings | HTTP | 4008 |
| Scheduler | HTTP | 4009 |
| Mailer | RMQ | 4010 |
| Admin | HTTP | 4011 |
| Recommendations | HTTP | 4012 |
| RabbitMQ UI | Management | 15672 |
| RabbitMQ broker | AMQP | 5672 |
| Redis | Redis | 6379 |

---

## 8. Why this project is structured this way

The structure fits a real-world healthcare platform because:

- patient workflows are separated from admin workflows
- AI services can evolve independently
- background jobs are isolated from user-facing APIs
- multiple storage systems are used where they fit best
- the gateway gives the frontend one stable API surface

This makes the system easier to present in an evaluation because it shows:

- modular design
- microservice communication
- async processing
- AI integration
- scheduled automation
- multi-database usage

---

## 9. Short explanation for the FYP evaluation

If a simple explanation is needed, the project can be described like this:

> Hygieia Backend is a microservice-based healthcare platform that centralizes patient services such as authentication, appointments, lab workflows, fitness tracking, notifications, and AI-powered recommendations. The system uses NestJS for structured backend services, FastAPI for machine-learning workloads, RabbitMQ and Redis for async processing, MongoDB and Supabase for data storage, and Docker for reproducible deployment.

---

## 10. Important note

Some folders and environment variables appear to be legacy or experimental, so the cleanest way to understand the system is to treat the services above as the active architecture described by the current codebase and compose file.
