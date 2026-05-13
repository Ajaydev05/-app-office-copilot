# QuickBite — Full Stack Food Delivery App

**Stack:** React (Frontend) · Node.js/Express (Backend) · MongoDB (containerized on ECS)  
**Deployment:** AWS ECS via AWS Copilot · Docker · ECR · Jenkins (auto version replace)

---

## Architecture

```
Internet
   ↓
ALB (public)
   ↓
[Frontend — ECS]  (React + Nginx, port 80)
   ↓  /api → internal DNS
[Backend  — ECS]  (Node.js, port 5000)
   ↓  mongodb://mongodb.production.quickbite.local:27017
[MongoDB  — ECS]  (mongo:7.0 official image, port 27017, EFS volume)

All 3 services run inside the same VPC — wired by AWS Copilot
```

---

## Project Structure

```
QuickBite_Final/
├── frontend/                        # React app (Nginx, port 80)
│   ├── Dockerfile
│   ├── nginx.conf                   # proxies /api → backend-service:5000
│   └── src/
├── backend/                         # Node.js/Express API (port 5000)
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js                # builds MongoDB URI from env vars
│       ├── models/                  # User, Restaurant, MenuItem, Order, Cart, Review
│       ├── routes/                  # auth, users, restaurants, menu, cart, orders, reviews, admin
│       ├── controllers/             # admin, user, restaurant
│       └── middleware/              # auth (JWT), role guard
├── copilot/
│   ├── frontend/manifest.yml        # Load Balanced Web Service (public ALB)
│   ├── backend-service/manifest.yml # Backend Service (internal, connects to mongodb)
│   ├── mongodb/manifest.yml         # Backend Service (mongo:7.0, EFS volume for data)
│   └── environments/production/manifest.yml
├── Jenkinsfile                      # triggered by GitHub webhook — version replace only
├── .gitignore
└── README.md
```

---

## Phase 1 — EC2 Setup (One-Time)

```bash
# Docker
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER && newgrp docker

# Jenkins
sudo apt install -y default-jdk
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt update && sudo apt install -y jenkins
sudo systemctl enable jenkins && sudo systemctl start jenkins

# AWS Copilot CLI
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
chmod +x copilot && sudo mv copilot /usr/local/bin/copilot

# AWS CLI
sudo apt install -y awscli
aws configure   # enter IAM key, secret, region (e.g. ap-south-1)
```

Open EC2 Security Group ports: **8080** (Jenkins), **80**, **443**.

---

## Phase 2 — Store Secrets in AWS SSM

```bash
# MongoDB credentials (used by both mongodb and backend-service containers)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_INITDB_ROOT_USERNAME \
  --value "quickbite_user" --type SecureString

aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_INITDB_ROOT_PASSWORD \
  --value "StrongPassword123" --type SecureString

aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_USERNAME \
  --value "quickbite_user" --type SecureString

aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_PASSWORD \
  --value "StrongPassword123" --type SecureString

aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/JWT_SECRET \
  --value "your-very-strong-jwt-secret" --type SecureString
```

---

## Phase 3 — Initial Deployment (Manual, One-Time)

```bash
git clone https://github.com/<your-org>/quickbite.git
cd quickbite

# Init Copilot
copilot app init quickbite
copilot env init --name production --profile default --default-config
copilot env deploy --name production

# Register services
copilot svc init --name mongodb         --svc-type "Backend Service"           --image mongo:7.0
copilot svc init --name backend-service --svc-type "Backend Service"           --dockerfile ./backend/Dockerfile
copilot svc init --name frontend        --svc-type "Load Balanced Web Service" --dockerfile ./frontend/Dockerfile

# Deploy in order: DB first, then backend, then frontend
copilot svc deploy --name mongodb         --env production
copilot svc deploy --name backend-service --env production
copilot svc deploy --name frontend        --env production
```

Copilot outputs the public **ALB URL** — that's your live frontend.

---

## Phase 4 — GitHub Webhook + Jenkins (One-Time)

1. Open Jenkins at `http://<EC2-IP>:8080`
2. Create **Pipeline** job → Source: GitHub repo → Script path: `Jenkinsfile`
3. Update `Jenkinsfile`: set your `AWS_ACCOUNT_ID` and `AWS_REGION`
4. In **GitHub → Settings → Webhooks → Add webhook:**
   - Payload URL: `http://<EC2-IP>:8080/github-webhook/`
   - Content type: `application/json`
   - Trigger: **Just the push event**

---

## Phase 5 — Every Code Push (Auto Version Replace)

```
Developer git push
      ↓
GitHub Webhook → Jenkins (EC2)
      ↓
docker build frontend + backend → push to ECR
      ↓
copilot svc deploy (mongodb → backend-service → frontend)
      ↓
ECS rolling update — old version replaced, zero downtime
```

> Jenkins is used **only for version replacement** — not for initial setup.

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env        # set MONGODB_URI=mongodb://localhost:27017/quickbite
npm install
npm run dev                 # runs on http://localhost:5000

# Frontend
cd frontend
npm install
npm start                   # runs on http://localhost:3000
```
