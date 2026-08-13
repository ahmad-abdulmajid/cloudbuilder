# CloudBuilder

**Automated Application Deployment on AWS**

## Project Overview

CloudBuilder is a self-service deployment platform that takes a public GitHub repository and turns it into a running application on AWS. A user enters a repository URL and a port, and the platform handles everything that follows: cloning the source, building a Docker image, publishing it to a private registry, provisioning a container task, launching it on serverless compute, and returning a public URL.

The project demonstrates how a DevOps deployment pipeline is assembled from AWS primitives, with an emphasis on least-privilege access control, operational visibility, and cost safety.

Developed as a graduation project at the Syrian Virtual University, Information Technology — Cybersecurity specialization.

## Deployment Pipeline

```
GitHub repository
       │
       ▼
   Clone source
       │
       ▼
   Build Docker image
       │
       ▼
   Push to Amazon ECR
       │
       ▼
   Register ECS task definition
       │
       ▼
   Launch task on AWS Fargate
       │
       ▼
   Resolve public IP  ──▶  Live application URL
```

Container logs stream to CloudWatch throughout, and are readable from inside the platform.

## Architecture

```
Browser (React)
      │  same-origin session cookie
      ▼
Express API  ──authentication guard──▶  Deployment orchestration
                                              │
                                              ├──▶  Docker      image build
                                              ├──▶  Amazon ECR  image registry
                                              ├──▶  Amazon ECS  Fargate tasks
                                              ├──▶  Amazon EC2  public IP resolution
                                              └──▶  CloudWatch  container logs
```

A single Express server delivers both the React interface and the API, giving the platform one origin, no cross-origin configuration, and one entry point to secure.

## Key Design Highlights

**Deployment automation**
- End-to-end pipeline from repository URL to live public URL, triggered by a single user action
- Deployment status tracking with full history per service, plus redeploy and teardown on demand
- A dedicated task definition family per service, so every deployed configuration is versioned
- Startup reconciliation that repairs deployments interrupted by a server restart

**Security**
- Session-based authentication composed from vetted primitives: bcrypt password hashing, cryptographically random session tokens, httpOnly and SameSite cookies, and server-side revocation on logout
- Authorization enforced at the router mount, so every current and future deployment route is protected by inheritance
- A dedicated IAM identity for the application, separate from the operator's, scoped to the minimum actions the pipeline requires
- The IAM policy is version-controlled alongside the code and was validated with paired allow and deny probes — proving not only that permitted actions succeed, but that everything else is refused

**Observability**
- Container logs shipped to CloudWatch Logs by the platform's generated task definitions
- Logs retrieved and displayed within the platform itself, behind authentication
- Explicit log retention rather than indefinite storage

**Cost safety**
- One-off container tasks instead of continuously running services, so stopped means stopped
- A failure after launch stops the task before the error is recorded, preventing untracked billable compute
- Task identifiers are persisted the moment a task starts, so an interrupted process still leaves a record of what is running
- The interface discloses per-second billing at the point where cloud deployment is chosen

## Technologies Used

- **Amazon ECS (Fargate)** — serverless container execution
- **Amazon ECR** — private Docker image registry
- **AWS IAM** — least-privilege access control for the application identity
- **Amazon CloudWatch Logs** — container log collection and retrieval
- **Docker** — application containerization and image builds
- **Node.js / Express** — deployment orchestration and API
- **React / Vite** — platform interface
- **AWS SDK v3** — programmatic control of AWS resources
- **Git / GitHub** — source retrieval for deployed applications

## Project Status

- Deployment pipeline implemented end to end and verified on AWS
- Authentication, least-privilege IAM, and CloudWatch log retrieval implemented and tested, including negative tests for denied access
- Validated by deploying an independent application — an appointment booking service — through the platform and using it over the public internet from a mobile device

## Scope and Limitations

Deliberate boundaries for a single-semester project, documented rather than hidden.

- **Single tenant.** Authentication establishes who may enter, not which services belong to whom. Multi-user support would require an identity provider, ownership recorded per service, per-request ownership checks, and isolation of AWS resources between users.
- **File-based state.** Deployment records are stored in a JSON file rather than a database. The storage layer is isolated behind a single module, making a migration to DynamoDB a contained change.
- **Locally hosted control plane.** Image builds require a Docker daemon on the host, which serverless container tasks do not provide, and the server holds AWS credentials. Public access is therefore granted on demand through an authenticated ephemeral tunnel rather than permanent hosting — exposure limited to the moment it is needed.
- **No CI/CD.** Deployment is initiated by a user action rather than by a commit. Adding a pipeline is the natural next step.
- **Shared network isolation.** Deployed services share one security group covering a port range; one group per service would narrow the blast radius.
- **Fixed image tags.** Each service publishes to a single registry tag, so a redeployment replaces the previous image and no rollback path exists. Tagging per build would provide one.

## Author

**Ahmad Abdulmajid**
Cybersecurity | Cloud Computing
Syrian Virtual University
