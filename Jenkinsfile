// ─────────────────────────────────────────────────────────────────
// Jenkins Pipeline — QuickBite
// Triggered by: GitHub Webhook on every git push
// Job: Replace old image with new image on ECR, then update ECS via Copilot
// Jenkins does NOT touch MongoDB — that is a one-time manual setup
// ─────────────────────────────────────────────────────────────────

pipeline {
  agent any

  environment {
    AWS_REGION     = 'ap-south-1'       // ← change to your region
    AWS_ACCOUNT_ID = '123456789012'     // ← change to your AWS Account ID
    ECR_FRONTEND   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/quickbite-frontend"
    ECR_BACKEND    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/quickbite-backend"
    IMAGE_TAG      = "${env.GIT_COMMIT[0..6]}"   // short commit SHA — unique tag per version
  }

  stages {

    // ── Step 1: Pull latest code from GitHub ──────────────────
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    // ── Step 2: Login to ECR ──────────────────────────────────
    stage('Login to ECR') {
      steps {
        sh """
          aws ecr get-login-password --region ${AWS_REGION} | \
          docker login --username AWS --password-stdin \
          ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
        """
      }
    }

    // ── Step 3: Build new Docker images on EC2 ────────────────
    // Jenkins uses Docker installed on EC2 to build new images.
    // MongoDB is NOT built here — it uses the official mongo:7.0 image, set up once manually.
    stage('Build Docker Images') {
      parallel {
        stage('Build Frontend') {
          steps {
            sh "docker build -t ${ECR_FRONTEND}:${IMAGE_TAG} -t ${ECR_FRONTEND}:latest ./frontend"
          }
        }
        stage('Build Backend') {
          steps {
            sh "docker build -t ${ECR_BACKEND}:${IMAGE_TAG} -t ${ECR_BACKEND}:latest ./backend"
          }
        }
      }
    }

    // ── Step 4: Push new images to ECR ───────────────────────
    // Old image stays in ECR with its old tag.
    // New image is pushed with commit SHA tag + overrides latest tag.
    stage('Push to ECR') {
      parallel {
        stage('Push Frontend') {
          steps {
            sh "docker push ${ECR_FRONTEND}:${IMAGE_TAG}"
            sh "docker push ${ECR_FRONTEND}:latest"
          }
        }
        stage('Push Backend') {
          steps {
            sh "docker push ${ECR_BACKEND}:${IMAGE_TAG}"
            sh "docker push ${ECR_BACKEND}:latest"
          }
        }
      }
    }

    // ── Step 5: Deploy new version via Copilot ────────────────
    // Copilot does NOT rebuild images here.
    // --tag tells Copilot which ECR image tag ECS should pull.
    // Copilot updates the ECS Task Definition to point to the new image,
    // then ECS does a rolling update — old containers replaced by new ones,
    // still running on the same ALB DNS name — zero downtime.
    // MongoDB is NOT touched here — it is a one-time setup only.
    stage('Deploy Frontend + Backend via Copilot') {
      steps {
        sh "copilot svc deploy --name backend-service --env production --tag ${IMAGE_TAG}"
        sh "copilot svc deploy --name frontend        --env production --tag ${IMAGE_TAG}"
      }
    }

  }

  post {
    success { echo "✅ Version ${IMAGE_TAG} is live on ECS via ALB DNS." }
    failure { echo "❌ Deployment failed. Check the logs above." }
    always  {
      // Clean up local Docker images from EC2 to free disk space
      sh "docker rmi ${ECR_FRONTEND}:${IMAGE_TAG} ${ECR_FRONTEND}:latest || true"
      sh "docker rmi ${ECR_BACKEND}:${IMAGE_TAG}  ${ECR_BACKEND}:latest  || true"
    }
  }
}
