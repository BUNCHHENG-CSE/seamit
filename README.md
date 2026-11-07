# TCT-SeamIT — All-in-One Next.js Full-Stack ITSM ⇄ ITAM Automated Seam Reconciler

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![Prisma 6](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS 4](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.4-FBF0DF?style=flat&logo=bun)](https://bun.sh/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)](https://neon.tech/)

**TCT-SeamIT** (`tct-seamit`) is an all-in-one full-stack enterprise console designed to bridge the operational seam between SMB ticketing platforms (Jira Service Management, Freshservice, Zendesk) and IT Asset Management (ITAM) inventories.

---

## 🌟 Key Features

1. **Discrepancy Radar**: Real-time asset auditor identifying ghost assets, expiring warranties, zombie repairs, and unlinked tickets with 1-click single & batch remediation.
2. **Bidirectional 2-Way Sync Engine**:
   - **Ticket ➔ Asset**: Automatically updates asset status, location, notes, and unassigns custodians when offboarding, repair, or decommissioning tickets resolve.
   - **Asset ➔ Ticket**: Proactively detects warranties expiring within 60 days and creates draft replacement tickets in Jira, Freshservice, or Zendesk.
3. **ITSM Connectors**: Native webhook normalization and REST API ticket dispatchers for Atlassian Jira, Freshworks Freshservice, Zendesk Support, and Slack/Teams alert channels (Mock Mode enabled by default for instant safe testing).
4. **Hardware Inventory**: Tagging, search & filter, batch updates, QR/Barcode asset label generation, and CSV import/export.
5. **Audit Trail & SOC 2 Report**: Real-time sync logs and official printable SOC 2 Type II / ISO 27001 audit attestation reports.

---

## 🏗️ Architecture: All-in-One Full-Stack

Converted from a split FastAPI + Vite setup to a unified, production-grade Next.js App Router application:

```
├── prisma/
│   ├── schema.prisma              # Active schema (managed by prisma-prepare)
│   ├── schema.sqlite.prisma       # Local SQLite schema (zero config)
│   ├── schema.postgresql.prisma   # Production PostgreSQL / Neon schema
│   └── dev.db                     # Local SQLite database
├── public/                        # Static assets (favicons, icons, hero)
├── scripts/
│   └── prisma-prepare.ts          # Auto-switches SQLite vs PostgreSQL schema
├── src/
│   ├── app/
│   │   ├── api/                   # All Next.js Route Handlers
│   │   │   ├── assets/            # List, create, bulk update, CSV import/export
│   │   │   ├── rules/             # Automation rules & recipe templates
│   │   │   ├── connectors/        # Jira, Freshservice, Zendesk, Slack configs
│   │   │   ├── logs/              # Sync audit logs & compliance export
│   │   │   ├── discrepancies/     # Discrepancy Radar scan & 1-click remediation
│   │   │   ├── notifications/     # Real-time alerts & test dispatch
│   │   │   ├── simulator/         # ITSM webhook payload test runner
│   │   │   ├── webhooks/          # Live webhook listeners ([source])
│   │   │   ├── reports/           # JSON & HTML SOC 2 audit reports
│   │   │   └── health/            # Healthcheck probe
│   │   ├── globals.css            # Tailwind v4 & JetBrains Mono theme
│   │   ├── layout.tsx             # Root layout with theme provider
│   │   └── page.tsx               # Main single-page console
│   ├── components/                # React UI components & dialogs
│   ├── context/                   # Dark/Light theme state
│   ├── lib/
│   │   ├── connectors/            # Jira, Freshservice, Zendesk, CSV
│   │   ├── engine/                # Rule Engine, Radar, Scheduler, Notifications
│   │   ├── prisma.ts              # Global Prisma client singleton
│   │   ├── seed.ts                # Database auto-seeder & CLI seeder
│   │   └── utils.ts               # Classnames helper
│   ├── types.ts                   # Unified TypeScript interfaces
│   └── api.ts                     # Frontend API client
├── .env                           # Local environment config
├── .env.example                   # Environment template
├── components.json                # shadcn configuration
├── package.json                   # Bun scripts and dependencies
└── tsconfig.json                  # TypeScript configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **[Bun](https://bun.sh/)** installed (`bun --version`)

### 2. Install Dependencies
```bash
bun install
```

### 3. Initialize & Seed Database
```bash
# Prepares schema and creates local SQLite database
bun run prisma:push

# Seeds realistic demo assets, connectors, rules, and audit logs
bun run db:seed
```

### 4. Start Development Server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) (or port 3001 if 3000 is occupied).

---

## 🗄️ Database: Local SQLite ⇄ Production Neon PostgreSQL

TCT-SeamIT features an automatic schema selector that makes switching between local development and production effortless:

### Local Development (Default):
In `.env`:
```env
DATABASE_URL="file:./prisma/dev.db"
```
When running `bun run dev` or `bun run build`, `scripts/prisma-prepare.ts` detects the `file:` URL and automatically uses `prisma/schema.sqlite.prisma`. Zero database server setup required!

### Production with Neon (PostgreSQL):
In your production environment (Vercel, Railway, Render, etc.):
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
`scripts/prisma-prepare.ts` detects the `postgresql://` prefix and automatically switches to `prisma/schema.postgresql.prisma` with native PostgreSQL types and connection pooling!

To push the PostgreSQL schema directly to Neon from CLI:
```bash
DATABASE_URL="postgresql://..." bun run prisma:push:pg
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Prepares schema and starts Next.js development server |
| `bun run build` | Prepares schema and compiles optimized production build |
| `bun run start` | Starts Next.js production server |
| `bun run prisma:push` | Pushes active schema to database (default SQLite) |
| `bun run prisma:push:pg` | Pushes PostgreSQL schema directly to Neon |
| `bun run prisma:generate` | Regenerates Prisma Client types |
| `bun run db:seed` | Seeds initial SMB demo data (assets, connectors, rules) |
| `bun run lint` | Runs ESLint validation |

---

## 🛡️ License

MIT License. Designed for SMB IT Operations & Endpoint Security.
