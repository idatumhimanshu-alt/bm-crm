# B&M CRM — Broker & Manager Property Search Database

Property CRM for the transactional property advisory vertical of Soil to Structure Pvt Ltd.

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Cloudflare Workers (via Next.js API routes)
- **Database**: Cloudflare D1 (SQLite) with FTS5 full-text search
- **Storage**: Cloudflare R2 (photos)
- **Auth**: Cloudflare Access (email OTP / Google SSO)
- **PDF**: Client-side generation with jsPDF

## Setup

### Prerequisites
- Node.js 18+
- npm
- Cloudflare account (free tier is sufficient)
- Wrangler CLI (`npm install -g wrangler`)

### 1. Install dependencies
```bash
npm install
```

### 2. Create Cloudflare resources
```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create bm-crm-db
# Copy the database_id from output → paste into wrangler.toml

# Create R2 bucket
npx wrangler r2 bucket create bm-crm-photos
```

### 3. Update wrangler.toml
Replace `YOUR_D1_DATABASE_ID` with the ID from step 2.

### 4. Initialize the database
```bash
# Local development
npm run db:init
npm run db:seed

# Remote (production)
npm run db:init:remote
npm run db:seed:remote
```

### 5. Set up Cloudflare Access
1. Go to Cloudflare Zero Trust dashboard
2. Create an Access Application for your Pages domain
3. Add an Access Policy allowing your team's email addresses
4. Auth methods: Email OTP and/or Google SSO

### 6. Update seed data
Edit `db/seed.sql` with your actual team email addresses.

### 7. Run locally
```bash
npm run dev
```

### 8. Deploy
```bash
npm run deploy
```

## Project Structure

```
bm-crm/
├── db/
│   ├── schema.sql          # D1 schema: property, user, activity_log, FTS5
│   └── seed.sql            # Initial users
├── src/
│   ├── app/
│   │   ├── layout.tsx      # App shell with header
│   │   ├── page.tsx        # Listing page (search + filters + grid)
│   │   ├── globals.css     # All styles
│   │   ├── api/
│   │   │   ├── properties/
│   │   │   │   ├── route.ts        # GET (list), POST (create)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts    # GET (single), PUT (update)
│   │   │   │       ├── export-data/route.ts  # GET (sanitized JSON for PDF)
│   │   │   │       └── photos/route.ts       # POST (upload to R2)
│   │   │   ├── photos/[key]/route.ts         # GET (serve from R2)
│   │   │   └── users/me/route.ts             # GET (current user)
│   │   └── properties/
│   │       ├── new/page.tsx         # Add property form
│   │       └── [id]/
│   │           ├── page.tsx         # Property detail + PDF export
│   │           └── edit/page.tsx    # Edit property form
│   └── lib/
│       ├── types.ts        # TypeScript types
│       ├── constants.ts    # Areas, configs, identifiable fields
│       ├── auth.ts         # CF Access JWT + DB user lookup
│       ├── db.ts           # Database queries
│       └── sanitize.ts     # PDF export sanitization
├── wrangler.toml           # Cloudflare bindings (D1 + R2)
├── next.config.mjs         # Next.js + Cloudflare Pages config
└── package.json
```

## Key Features

- **FTS5 Search**: Full-text search across location, configuration, property type, description, amenities
- **4 Filters**: Location area, configuration (multi-select), budget range, status (multi-select)
- **Sanitized PDF Export**: Strips owner info, exact address, floor/unit, exterior photos. Scans description for potential leaks.
- **Photo Compression**: Client-side Canvas API compression (max 1200px, 80% JPEG quality)
- **Activity Log**: Tracks create, update, photo upload, PDF export actions
- **Role-based Access**: super_admin, sales, executive (via Cloudflare Access)

## Identifiable Fields (stripped from PDF)

These fields are **never** included in the sanitized PDF export:
- `exact_address`, `building_name`, `floor`, `unit_number`
- `owner_name`, `owner_phone`, `owner_email`
- `source`, `source_details`
- `internal_notes`
- `exterior_photos`
