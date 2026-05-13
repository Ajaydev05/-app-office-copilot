# QuickBite — All Commands to Run (In Order)

> Run everything from your EC2 terminal unless stated otherwise.
> Replace `123456789012` with your AWS Account ID and `ap-south-1` with your region everywhere.

---

## PHASE 1 — EC2 Setup (One-Time)

### Install Docker
```bash
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
# Verify
docker --version
```

### Install AWS CLI
```bash
sudo apt install -y awscli
aws configure
# Enter: AWS Access Key ID, Secret, Region (ap-south-1), Output format (json)
```

### Install AWS Copilot CLI
```bash
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
chmod +x copilot
sudo mv copilot /usr/local/bin/copilot
# Verify
copilot --version
```

---

## PHASE 2 — Create ECR Repositories (One-Time)

```bash
# Create ECR repo for frontend
aws ecr create-repository --repository-name quickbite-frontend --region ap-south-1

# Create ECR repo for backend
aws ecr create-repository --repository-name quickbite-backend --region ap-south-1
```

---

## PHASE 3 — Build Docker Images on EC2 (One-Time, Initial)

```bash
# Clone your project on EC2
git clone https://github.com/<your-username>/quickbite.git
cd quickbite

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com

# Build frontend image
docker build -t 123456789012.dkr.ecr.ap-south-1.amazonaws.com/quickbite-frontend:latest ./frontend

# Build backend image
docker build -t 123456789012.dkr.ecr.ap-south-1.amazonaws.com/quickbite-backend:latest ./backend

# Push frontend image to ECR
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/quickbite-frontend:latest

# Push backend image to ECR
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/quickbite-backend:latest
```

---

## PHASE 4 — Store Secrets in AWS SSM (One-Time)

```bash
# MongoDB root username (used by MongoDB container)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_INITDB_ROOT_USERNAME \
  --value "quickbite_user" \
  --type SecureString \
  --region ap-south-1

# MongoDB root password (used by MongoDB container)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_INITDB_ROOT_PASSWORD \
  --value "StrongPassword123" \
  --type SecureString \
  --region ap-south-1

# MongoDB username (used by backend to connect)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_USERNAME \
  --value "quickbite_user" \
  --type SecureString \
  --region ap-south-1

# MongoDB password (used by backend to connect)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/MONGO_PASSWORD \
  --value "StrongPassword123" \
  --type SecureString \
  --region ap-south-1

# JWT Secret (used by backend for auth tokens)
aws ssm put-parameter \
  --name /copilot/quickbite/production/secrets/JWT_SECRET \
  --value "your-very-strong-jwt-secret-here" \
  --type SecureString \
  --region ap-south-1
```

---

## PHASE 5 — Copilot Initial Deployment (One-Time)

### Step 1 — Initialize Copilot App
```bash
cd quickbite
copilot app init quickbite
```

### Step 2 — Create Production Environment
```bash
copilot env init --name production --profile default --default-config
```
> Copilot creates: VPC, Subnets, ECS Cluster, ALB, Security Groups — all inside AWS automatically.

### Step 3 — Deploy the Environment
```bash
copilot env deploy --name production
```

### Step 4 — Register Services with Copilot
```bash
# Register MongoDB service (uses official mongo:7.0 from Docker Hub — no ECR needed)
copilot svc init --name mongodb \
  --svc-type "Backend Service" \
  --image mongo:7.0

# Register backend service (uses image already in ECR)
copilot svc init --name backend-service \
  --svc-type "Backend Service" \
  --dockerfile ./backend/Dockerfile

# Register frontend service (uses image already in ECR)
copilot svc init --name frontend \
  --svc-type "Load Balanced Web Service" \
  --dockerfile ./frontend/Dockerfile
```

### Step 5 — Deploy Services (ORDER MATTERS: DB → Backend → Frontend)
```bash
# 1. Deploy MongoDB first
copilot svc deploy --name mongodb --env production

# 2. Deploy Backend (connects to MongoDB internally)
copilot svc deploy --name backend-service --env production

# 3. Deploy Frontend (connects to Backend internally, exposed via ALB)
copilot svc deploy --name frontend --env production
```

### Step 6 — Get Your Live DNS Name
```bash
copilot svc show --name frontend
```
> Copilot prints the **ALB DNS name** — this is your live URL, e.g.:
> `http://quick-Publi-XXXXXXXXXXXX.ap-south-1.elb.amazonaws.com`
>
> Frontend → Backend → MongoDB are all connected inside VPC automatically by Copilot.

---

## PHASE 6 — Install Jenkins on EC2 (One-Time, After Copilot Setup)

```bash
# Install Java (Jenkins needs it)
sudo apt install -y default-jdk

# Add Jenkins repo and install
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | \
  sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian binary/ | \
  sudo tee /etc/apt/sources.list.d/jenkins.list

sudo apt update && sudo apt install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Add jenkins user to docker group so Jenkins can run docker commands
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

> Open EC2 Security Group — allow port **8080** inbound.
> Access Jenkins at: `http://<EC2-PUBLIC-IP>:8080`

---

## PHASE 7 — GitHub Webhook Setup (One-Time)

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Set:
   - **Payload URL:** `http://<EC2-PUBLIC-IP>:8080/github-webhook/`
   - **Content type:** `application/json`
   - **Trigger:** Just the `push` event
3. In Jenkins UI:
   - Create a new **Pipeline** job
   - Source: **GitHub repo URL**
   - Script path: `Jenkinsfile`
   - Enable: **GitHub hook trigger for GITScm polling**

---

## PHASE 8 — Every Code Update (Automatic from here)

```
Developer runs:  git add . && git commit -m "update" && git push

GitHub Webhook fires → Jenkins triggered automatically

Jenkins on EC2:
  docker build new frontend image → docker push to ECR
  docker build new backend image  → docker push to ECR

Copilot:
  copilot svc deploy --name backend-service --env production --tag <commit-sha>
  copilot svc deploy --name frontend        --env production --tag <commit-sha>

ECS:
  Pulls new image from ECR
  Rolling update — old containers replaced by new containers
  Same ALB DNS name — zero downtime
```

> MongoDB is NEVER touched by Jenkins. It runs continuously on ECS.

---

## Useful Copilot Commands (Anytime)

```bash
# Check status of all services
copilot svc ls

# View logs of a service
copilot svc logs --name frontend --env production --follow
copilot svc logs --name backend-service --env production --follow
copilot svc logs --name mongodb --env production --follow

# Show service details + DNS name
copilot svc show --name frontend

# Check environment status
copilot env show --name production

# Restart a service (re-deploys current image)
copilot svc deploy --name frontend --env production
```
