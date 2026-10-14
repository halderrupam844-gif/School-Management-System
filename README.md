# SchoolDesk — School Management System

A mobile-friendly React/Vite frontend with an Express/Node.js API and Supabase Auth/Postgres integration.

## Requirements
- Node.js 20+ (recommended)
- Your Supabase project URL and **Publishable/anon key**
- Existing Supabase tables and appropriate Row Level Security (RLS) policies

## Setup
1. Extract the ZIP.
2. Copy `.env.example` to `.env`.
3. Fill in both Supabase key pairs (the URL is already set for the project):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```
5. Open the Vite URL printed in the terminal. The frontend proxies `/api` requests to the Express API on port 3001.

## Production build
```bash
npm run build
npm start
```
For production hosting, configure the environment variables in the hosting dashboard. Configure the host to serve the Vite `dist` assets and proxy `/api` to the Express server, or deploy frontend and backend separately. Do not expose server environment variables.

## Security notes
- This project deliberately does **not** use a Supabase `service_role` or secret key.
- API requests require a Supabase access token and use that user's JWT so database RLS policies remain in force.
- The generic record form accepts JSON matching the existing table schema. It is not a replacement for table-specific validation.
- New sign-ups may require email confirmation, depending on your Supabase Auth settings.
- Configure RLS policies for each role and table before using real school data. The backend cannot bypass them.
- Some tables may not have an `id` primary key; the generic update/delete helpers assume an `id` field, so use table-specific routes for those schemas.
- Counts on the dashboard are based on the first 50 visible rows per table, not total exact database counts.
- This is a starter project. Review schema constraints, role authorization, and production hosting before real deployment.

## Existing project
Supabase URL: `https://csrjykobfgvkiimzpihh.supabase.co`
