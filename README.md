# foodPac

Custom food packaging platform for Canadian restaurants — AI-powered design, quote management, and order tracking.

## Tech Stack

- **Frontend**: HTML + Tailwind CSS + Vanilla JS, served by Nginx
- **Backend**: Spring Boot 3 (Java 21), Spring Security, Spring Data JPA
- **Database**: PostgreSQL 16
- **Auth**: Google OAuth 2.0 + JWT
- **AI Design**: OpenAI + Packify API
- **Email**: Resend API
- **Deployment**: Docker Compose

## Getting Started

### Prerequisites

- Docker & Docker Compose
- A Resend account with a verified domain
- Google OAuth credentials
- OpenAI API key

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/yshang5/foodpac.git
   cd foodpac
   ```

2. Copy and fill in the environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your real credentials
   ```

3. Start all services:
   ```bash
   docker compose up -d
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Services

| Service  | Port | Description          |
|----------|------|----------------------|
| frontend | 3000 | Nginx static server  |
| backend  | 8080 | Spring Boot API      |
| db       | 5432 | PostgreSQL database  |

## Email Notifications

Two types of automated emails are sent to the team:

- **Cart Quote** — scheduler polls every 5 minutes for new quote submissions and sends a bilingual (EN/中文) summary email
- **Contact Form Quote** — immediately sends when a visitor submits "Get a Free Quote"

## Environment Variables

See `.env.example` for all required variables.
