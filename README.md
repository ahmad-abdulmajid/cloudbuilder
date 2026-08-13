# CloudBuilder

A self-service deployment platform that takes a public GitHub repository and returns a running application on AWS.

Paste a repository URL, choose a port, click Deploy. The platform clones the repository, builds a Docker image, pushes it to Amazon ECR, registers an ECS task definition, launches the container on AWS Fargate, and returns a public URL — with live status, container logs, and one-click teardown.

Built as a graduation project for the Syrian Virtual University (Information Technology, Cybersecurity specialization).

---

## What it does

| | |
|---|---|
| **Input** | A public GitHub repository containing a `Dockerfile`, plus a port |
| **Output** | A running container on AWS Fargate reachable at `http://<public-ip>:<port>` |
| **Pipeline** | clone → build → push to ECR → register task definition → run task → resolve public IP |
| **Also** | deployment history, redeploy, undeploy, container logs, authentication |

## Architecture

```
Browser (React SPA)
        │  same-origin, session cookie
        ▼
Express API  ── requireAuth ──▶ deployment orchestration
        │                              │
        │                              ├──▶ Docker (local build)
        │                              ├──▶ Amazon ECR   (image registry)
        │                              ├──▶ Amazon ECS   (Fargate tasks)
        │                              ├──▶ Amazon EC2   (public IP lookup)
        │                              └──▶ CloudWatch   (container logs)
        │
        └──▶ services.json (deployment state)
```

The Express server serves both the built React frontend and the API under `/api/`, so there is a single origin and no CORS configuration.

## Features

**Deployment**
- One-click deployment from a public GitHub repository to AWS Fargate
- Local Docker deployment as an alternative target, useful for development
- Redeploy and undeploy on demand
- Per-service task definition families, so each deployment keeps a versioned history of its configuration
- Startup recovery sweep that reconciles deployments interrupted by a server restart

**Security**
- Session-based authentication: bcrypt password hashing, cryptographically random session tokens, httpOnly and SameSite cookies, server-side revocation on logout
- Every deployment route guarded at the router mount, so new routes are protected by inheritance
- A dedicated IAM identity for the application, separate from the operator's, scoped to the minimum actions the platform needs
- The IAM policy is committed as code in [`cloudbuilder-deploy-policy.json`](cloudbuilder-deploy-policy.json) and was verified with paired allow and deny probes

**Observability**
- Container logs shipped to CloudWatch Logs by the platform-generated task definitions
- Logs retrieved and displayed inside the platform, behind authentication
- Bounded log retention rather than indefinite storage

**Cost safety**
- One-off ECS tasks rather than long-running services, so nothing keeps billing after a stop
- A failure after task launch stops the task before recording the error
- The task ARN is persisted immediately after launch, so a crashed process still leaves a record of billable compute
- The UI discloses that Fargate deployments bill per second at the point where the target is chosen

## Tech stack

Node.js · Express · React · Vite · Docker · Amazon ECR · Amazon ECS (Fargate) · IAM · CloudWatch Logs · AWS SDK v3

## Getting started

### Prerequisites

- Node.js 18+
- Docker, running locally (the platform builds images on the host)
- An AWS account with an IAM user for the application
- AWS resources created in advance: an ECR repository, an ECS cluster, an ECS task execution role, a CloudWatch log group, and a security group allowing inbound TCP on the port range you intend to use

### Installation

```bash
git clone https://github.com/ahmad-abdulmajid/cloudbuilder.git
cd cloudbuilder

# backend
cd backend && npm install

# frontend
cd ../frontend && npm install && npm run build
```

### Configuration

Create `backend/.env`:

```ini
AWS_ACCESS_KEY_ID='...'
AWS_SECRET_ACCESS_KEY='...'
AWS_REGION='eu-central-1'

AUTH_EMAIL='you@example.com'
AUTH_PASSWORD_HASH='<bcrypt hash>'
```

Generate the password hash rather than storing a plaintext password:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'your-password'
```

Values are single-quoted because bcrypt hashes contain `$`.

### Running

```bash
cd backend && npm start
```

The application is served at `http://localhost:5000` — frontend and API on the same origin.

## Documentation

- [`cloudbuilder-deploy-policy.json`](cloudbuilder-deploy-policy.json) — the IAM policy granted to the application identity

## Scope and limitations

These are deliberate boundaries for a single-semester project, documented rather than hidden.

- **Single tenant.** Authentication answers "may you enter?", not "which services are yours?". Multi-user support would require a user store, an owner field stamped from the session, per-route ownership checks, and per-user AWS resource isolation.
- **File-based storage.** Deployment state lives in a JSON file rather than a database. The storage layer is isolated behind a single module, so migrating to DynamoDB is a contained change.
- **The control plane runs locally.** Deployments shell out to a Docker daemon on the host, which Fargate tasks do not provide, and the server holds AWS credentials. Public access is provided on demand through an authenticated ephemeral tunnel rather than permanent hosting.
- **No CI/CD.** Deployment is triggered by a user action, not by a commit. Adding a pipeline is a natural next step.
- **Shared security group.** All deployed services share one security group covering a port range. One security group per service would reduce blast radius.
- **Fixed image tags.** Each service pushes to a single ECR tag, so a redeploy overwrites the previous image and there is no rollback. Tagging per build would enable one.
- **No ECS health check.** ECS knows the container process is alive, not that the application responds.

## Cost

Fargate is not covered by the AWS free tier and bills per second while a task runs. The platform is designed around this: tasks are one-off rather than long-running, teardown is one click, and the interface states the cost before a cloud deployment is chosen. Verify nothing is running with:

```bash
aws ecs list-tasks --cluster <your-cluster> --region <your-region>
```

An empty `taskArns` array means no compute is billing.

## License

MIT
