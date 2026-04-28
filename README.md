# CloudNotes

Cloud‑Native Note Management System with CI/CD and RAG‑based Search (In progress).

---

## Technical Report

PDF: https://drive.google.com/file/d/162ntth6tT7vRTa-VRmwPRFAViCXanT6F/view?usp=sharing

---

## Deployed Version

Link: https://mycloudnotes.com/

---

## Table of Contents

* [Overview](#overview)
* [Deployment Flow](#deployment-flow)

  * [Step 1 — Backend Setup](#step-1---backend-setup)
  * [Step 2 — Frontend & Passport Setup](#step-2---frontend--passport-setup)
* [Accessing the Application](#accessing-the-application)
* [Useful Commands](#useful-commands)
* [Environment & Paths](#environment--paths)
* [Troubleshooting](#troubleshooting)
* [Example Full Setup](#example-full-setup)

---

## Overview

This repository uses **Docker** and **Kubernetes (Minikube)** for local development and testing. The deployment is split into two scripts to ensure the backend services (DB, cache, Laravel server) are available before the frontend and OAuth (Passport) are configured.

* `deploy-first-step.sh` — boots Minikube, builds the server image, deploys MySQL, Redis, Laravel (server) and server Nginx, generates `APP_KEY` and patches Kubernetes secrets.
* `deploy-second-step.sh` — installs Laravel Passport (generates OAuth client credentials), builds the frontend image (injecting client credentials), and deploys the client, queue worker, and ingress.

---

## Deployment Flow

### Step 1 — Backend Setup

Run:

```bash
./deployment/scripts/deploy-first-step.sh [environment]
```

**What this script does:**

1. Resets / recreates the Minikube cluster (if needed).
2. Enables required addons (ingress, ingress-dns).
3. Sets Docker context to Minikube daemon so images are built into Minikube.
4. Builds the Laravel server image (`cloudnotes-server`).
5. Applies Kubernetes manifests for:

   * MySQL (PVC, Deployment, Service)
   * Redis (Deployment, Service)
   * Laravel server (Deployment, Service)
   * server-nginx (Deployment, Service, ConfigMap)
6. Generates a new `APP_KEY` and updates the `cloudnotes-env` secret.
7. Waits for pods to be ready.

**Verify**

```bash
kubectl get pods -n cloudnotes-[environment]

kubectl get svc -n cloudnotes-[environment]
```

You should see `mysql`, `redis`, `server`, and `server-nginx` in `Running` state.

**Run migrations & seeds (optional in-cluster):**

```bash
kubectl exec -it -n cloudnotes-[environment] deploy/server -- php artisan migrate --seed --force
```

> The script will generate and inject a Laravel `APP_KEY` into Kubernetes secrets and restart the server deployment so the application reads the new key.

---

### Step 2 — Frontend & Passport Setup

Run:

```bash
./deployment/scripts/deploy-second-step.sh [environment]
```

**What this script does:**

1. Installs and configures **Laravel Passport** in the running application (generates `CLIENT_ID` and `CLIENT_SECRET`).
2. Updates `cloudnotes-env` secret with Passport credentials.
3. Builds the frontend (client) Docker image (`cloudnotes-client`) with the proper runtime environment variables.

   * NOTE: Avoid embedding secrets in image build args for production; the build in this repo does inject client id/secret for local convenience.
4. Applies the final overlay: client deployment, queue worker, configmaps, ingress, and any additional services.
5. Waits for all deployments to reach `Available` state.

**Verify**

```bash
kubectl get pods -n cloudnotes-[environment]
kubectl get ingress -n cloudnotes-[environment]
```

Expected pods:

```
client                1/1     Running
mysql                 1/1     Running
queue-worker          1/1     Running
redis                 1/1     Running
server                1/1     Running
server-nginx          1/1     Running
```

---

## Accessing the Application

1. Start Minikube tunnel (for ingress to be routable on the host):

```bash
minikube tunnel
```

2. Check the ingress host configured for your environment:

```bash
kubectl get ingress -n cloudnotes-[environment]
```

3. Open the host listed under `HOSTS` in your browser. Common values used in local runs:

* `cloudnotes.127.0.0.1.nip.io` (nip.io auto-resolves)
* `cloudnotes.local` (if you add an `/etc/hosts` entry)

**Example hosts file entry (if using `cloudnotes.local`)**

```
127.0.0.1   cloudnotes.local
```

---

## Useful Commands

```bash
# Get all resources in the namespace
kubectl get all -n cloudnotes-[environment]

# Get pods
kubectl get pods -n cloudnotes-[environment]

# View logs for the server
kubectl logs -n cloudnotes-[environment] deploy/server

# Exec into server pod
kubectl exec -it -n cloudnotes-[environment] deploy/server -- bash

# Restart a deployment
kubectl rollout restart deployment server -n cloudnotes-[environment]

# Delete namespace (clean slate)
kubectl delete namespace cloudnotes-[environment]

# Remove minikube cluster
minikube delete
```

---

## Environment & Paths

* Environment files: `deployment/envs/[environment].env`
* Kustomize overlays / manifests: `k8s/overlays/[environment]`
* Scripts: `deployment/scripts/deploy-first-step.sh` and `deployment/scripts/deploy-second-step.sh`
* Backend image name: `cloudnotes-server`
* Frontend image name: `cloudnotes-client`

---

## Troubleshooting

* **Ingress not available**: Ensure `minikube tunnel` is running and that the ingress addon was enabled by the first-step script.
* **Image pulls failing inside Minikube**: If the Minikube container cannot access `registry.k8s.io` or `docker.io`, check your host network / proxy inside Minikube (see `minikube ssh` and proxy docs).
* **Secrets missing last-applied-configuration warning**: This is informational; `kubectl apply` will patch missing annotations. No action required for local development.
* **Client build logs warn about secrets in ENV/ARG**: For local runs this is convenient but avoid storing secrets in image build arguments for production builds.

---

## Example Full Setup

```bash
# 1) Backend (build images, deploy DB, cache, server)
./deployment/scripts/deploy-first-step.sh local

# 2) Frontend and Passport (generate oauth credentials, build client, apply overlay)
./deployment/scripts/deploy-second-step.sh local

# 3) Allow ingress routing
minikube tunnel

# 4) Open the app in your browser (check ingress host):
#    http://cloudnotes.127.0.0.1.nip.io OR http://cloudnotes.local (if /etc/hosts configured)
```

---

## License

This project is provided under the MIT License. See `LICENSE` for details.
