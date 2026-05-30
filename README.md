# Fraud Detection & Transaction Monitoring System 🛡️

An enterprise-grade, full-stack banking simulator designed for scale, security, and real-time fraud analysis.

## Features
* **Role-Based Access Control:** Strict JWT authorization for `USER`, `ANALYST`, and `ADMIN`.
* **ACID Transactions:** Thread-safe banking logic for Deposits, Withdrawals, and Transfers.
* **Fraud Detection Engine:** Real-time rule evaluation (high-frequency monitoring, amount thresholds).
* **Alert System:** Specialized dashboards for analysts to review, annotate, and resolve suspicious activity.
* **Caching:** High-performance data retrieval using Redis.
* **Audit Logging:** Immutably records critical system actions.

## Tech Stack
* **Backend:** Java 17, Spring Boot 3, Spring Security, JWT, JPA, Hibernate
* **Database:** PostgreSQL, Redis (Caching)
* **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
* **DevOps:** Docker, Docker Compose, GitHub Actions (CI/CD)

## Quick Start
1. Ensure Docker is installed and running on your machine.
2. Run `docker-compose up -d` to boot the PostgreSQL database and Redis cluster.
3. Start Backend: `cd backend && ./mvnw spring-boot:run`
4. Start Frontend: `cd frontend && npm run dev`

## Architecture
The application follows a standard N-Tier architecture pattern separating Controllers, Services, and Repositories. The frontend communicates with the backend via stateless REST APIs secured by Bearer Tokens.
