# CloudNotes (Application Code)

This repository contains the application source code for **CloudNotes**—a secure cloud-native note-taking application equipped with security protocols, user profile management, custom theme controls (Stratosphere/Nocturne), and RAG-based AI assistant capabilities.

For provisioning infrastructure, Kubernetes configurations, and local development deployment scripts, see the DevSecOps repository: **[cloudnotes-infra](../cloudnotes-infra)**.

---

## Repository Structure

```text
cloudnotes-app/
├── client/          # Vite + React (TypeScript) frontend application
├── server/          # Laravel (PHP) secure backend REST API
├── ai/              # Python RAG / document-embedding processor service
├── LICENSE          # MIT License
└── README.md        # This readme file
```

---

## Development Prerequisites

* **Node.js** v20+ (for client)
* **Composer** & **PHP 8.2** (for server)
* **Python 3.10+** (for RAG/AI service)
* **Docker** & **Minikube** (for deploying the stack local cluster via `cloudnotes-infra`)

---

## Application Modules

### 1. Frontend Client (`/client`)
Built using Vite, React 18, Tailwind CSS, and TypeScript.
* Features unified responsive theme (Light mode "Stratosphere" / Dark mode "Nocturne").
* Fully validated client-side forms (Login, Registration, Forgot Password, Reset Password, and User Profile Details).
* Real-time notifications powered by `react-hot-toast` with middle screen alignment.

### 2. Backend Server (`/server`)
Secure PHP API built with Laravel.
* Authenticates requests using Laravel Passport OAuth2.
* Coordinates database transactions and schedules background processing queues.
* Manages encrypted storage and attachment management.

### 3. AI Service (`/ai`)
Python-based microservice managing vector embeddings and document indexing.
* Connected to MySQL / PostgreSQL and Vector stores.
* Provides Graph-RAG-native context to the user assistant.

---

## Deployment & Setup

This repository is linked as a Git Submodule inside **[cloudnotes-infra](../cloudnotes-infra)**.
To build and deploy the complete stack locally using Minikube:
1. Clone the infrastructure repository.
2. Initialize submodules.
3. Run the setup scripts in `cloudnotes-infra/deployment/scripts`.

See the **[cloudnotes-infra README](../cloudnotes-infra/README.md)** for details.
