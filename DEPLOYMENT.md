# DriveFlow — Deployment Guide

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works for testing)
- A [Vercel](https://vercel.com) account (recommended) or Docker host
- A domain (e.g., `driveflow.com.au`) — optional for local testing

---

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Pick a region close to your users (e.g., `ap-southeast-2` for Australia)
3. Set a strong database password — save it securely

### Run Migrations

**Option A — Direct SQL (Supabase Dashboard)**

Open the SQL Editor in your Supabase dashboard and run each migration file in order:

```
supabase/migrations/00001_foundation.sql
supabase/migrations/00002_multi_tenancy_rls.sql
supabase/migrations/00003_driving_school_core.sql
supabase/migrations/00004_availability.sql
supabase/migrations/00005_bookings.sql
supabase/migrations/00006_student_portal.sql
supabase/migrations/00007_reviews_success_stories.sql
supabase/migrations/00008_payments.sql
supabase/migrations/00009_notifications.sql
supabase/migrations/00010_subscriptions.sql
supabase/migrations/00011_audit_logs.sql
supabase/migrations/00012_advanced_features.sql
```

**Option B — CLI script (requires `psql`)**

```bash
export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres'
npm run db:migrate
```

### Collect Keys

From **Settings → API** in your Supabase dashboard, copy:

| Key | Where it goes |
|-----|---------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` secret key | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **Never expose the service role key to the browser.**

---

## 2. Seed Demo Data (Optional)

```bash
cp .env.example .env.local
# Fill in the Supabase keys

npm run db:seed
npm run db:create-admin your@email.com your-password
```

This creates a demo school "Sydney Driving Academy" with lesson types, packages, and service areas.

---

## 3. Deploy to Vercel (Recommended)

### Connect Repository

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new) → Import your repository
3. Vercel auto-detects Next.js — no build config changes needed

### Set Environment Variables

In Vercel Project → **Settings → Environment Variables**, add:

| Variable | Value | Environments |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | `driveflow.com.au` | All |
| `NEXT_PUBLIC_PLATFORM_NAME` | `DriveFlow` | All |
| `NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN` | `admin` | All |
| `NEXT_PUBLIC_APP_URL` | `https://driveflow.com.au` | Production |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production |

### Configure Multi-Tenant Domains

DriveFlow uses hostname-based tenant resolution. Each school gets a subdomain:

```
sydney-driving-academy.driveflow.com.au → tenant website
admin.driveflow.com.au                  → platform admin
```

**Wildcard domain on Vercel:**

1. In Vercel → **Settings → Domains**, add `*.driveflow.com.au`
2. In your DNS provider, add a CNAME record:
   - `*` → `cname.vercel-dns.com`

**Custom domains per school:**

When a school adds a custom domain (e.g., `www.sydneydrivingacademy.com.au`):

1. They create a CNAME pointing to `cname.vercel-dns.com`
2. Add the domain in Vercel → **Settings → Domains**
3. Vercel auto-provisions SSL
4. The middleware resolves the hostname to the correct tenant

### Deploy

```bash
git push origin main
# Vercel auto-deploys on push
```

Verify: `https://your-domain.vercel.app/api/health`

---

## 4. Deploy with Docker (Self-Hosted)

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  --build-arg NEXT_PUBLIC_PLATFORM_DOMAIN=driveflow.com.au \
  --build-arg NEXT_PUBLIC_PLATFORM_NAME=DriveFlow \
  --build-arg NEXT_PUBLIC_APP_URL=https://driveflow.com.au \
  -t driveflow .
```

### Run

```bash
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  driveflow
```

### Reverse Proxy (Nginx)

For multi-tenant wildcard domains, configure Nginx:

```nginx
server {
    listen 443 ssl;
    server_name *.driveflow.com.au driveflow.com.au;

    # Wildcard SSL (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/driveflow.com.au/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/driveflow.com.au/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Stripe Webhook Setup

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://driveflow.com.au/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.refund.updated`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 6. Post-Deployment Checklist

- [ ] Health check returns 200: `GET /api/health`
- [ ] Supabase RLS is enabled on all tables (verify in dashboard → Table Editor)
- [ ] Platform admin accessible at `admin.driveflow.com.au/admin`
- [ ] Demo school accessible at `sydney-driving-academy.driveflow.com.au`
- [ ] Dashboard accessible at `/dashboard` when signed in
- [ ] Stripe webhook test event succeeds
- [ ] Wildcard DNS resolves `*.driveflow.com.au`
- [ ] SSL certificates are active

---

## 7. Monitoring

### Health Endpoint

```
GET /api/health
→ { status: "healthy", checks: { app: "ok", database: "ok" }, latencyMs: 42 }
```

Point your uptime monitor (UptimeRobot, Better Uptime, etc.) at this endpoint.

### Recommended Services

| Concern | Service |
|---------|---------|
| Error tracking | [Sentry](https://sentry.io) — add `SENTRY_DSN` |
| Uptime monitoring | UptimeRobot / Better Uptime |
| Log aggregation | Vercel Logs (built-in) or Datadog |
| Database monitoring | Supabase Dashboard → Reports |

---

## Environment Variable Reference

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client + Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server only | Supabase service role key (bypasses RLS) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | ✅ | Client + Server | Base domain (e.g., `driveflow.com.au`) |
| `NEXT_PUBLIC_PLATFORM_NAME` | ✅ | Client + Server | Platform display name |
| `NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN` | ❌ | Client + Server | Admin subdomain (default: `admin`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Client + Server | Full app URL |
| `NODE_ENV` | ❌ | Server | `production` / `development` |
| `STRIPE_SECRET_KEY` | ❌* | Server only | Stripe secret key (*required for payments) |
| `STRIPE_WEBHOOK_SECRET` | ❌* | Server only | Stripe webhook signing secret |
| `RESEND_API_KEY` | ❌ | Server only | Resend email API key (falls back to log provider) |
| `SENTRY_DSN` | ❌ | Server only | Sentry error tracking DSN |
