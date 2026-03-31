@AGENTS.md

# Super Hire — Project Context

## What is this?
Multi-tenant ATS (Applicant Tracking System) for startups.
Companies manage job postings and track candidates through a hiring pipeline.

## Tech Stack
Next.js 15 · TypeScript · Supabase · Tailwind CSS · shadcn/ui · Resend · next-intl · Vercel

## Database Tables
- enterprises — companies using Super Hire
- enterprise_members — team members per company (roles: owner/admin/member)
- jobs — job postings (status: draft/open/closed/archived)
- candidates — applicants, unique per enterprise by email
- applications — candidate to job link with kanban stage
  (stages: applied/screening/interview/offer/hired/rejected)

## #1 Rule: enterprise_id on EVERYTHING
Every single database query MUST filter by enterprise_id.
Get enterprise_id from enterprise_members table using auth.getUser().
Never trust enterprise_id from the browser or client.

## Folder Structure
src/app/(auth)/            → login, signup pages
src/app/(dashboard)/       → all protected pages
src/components/ui/         → shadcn/ui components
src/components/jobs/       → job feature components
src/components/candidates/ → candidate feature components
src/lib/supabase/          → client.ts, server.ts, middleware.ts
src/actions/               → all Server Actions (mutations)
src/types/                 → TypeScript types
supabase/migrations/       → SQL migration files

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   (server only — never expose to browser)
NEXT_PUBLIC_APP_URL

## Commands
npm run dev      → local development
npm run build    → production build (run before every commit)

## Progress
- [x] Phase 1 — Project setup, Supabase connected, live on Vercel
- [x] Phase 2 — Database schema (5 tables with RLS)
- [ ] Phase 3 — Auth pages (login, signup, onboarding)
- [ ] Phase 4 — Jobs feature (list, create, kanban)
- [ ] Phase 5 — Candidates feature
- [ ] Phase 6 — Team collaboration
- [ ] Phase 7 — i18n + testing + launch
