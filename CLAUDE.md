## Project Overview

Super Hire is a lightweight ATS for startups that centralizes candidate pipeline management, team collaboration, and email communication in one place. Teams can set up hiring operations quickly and manage candidates across a kanban pipeline without leaving the product.

---

## Tech Stack

| Tool | Version / Notes |
|---|---|
| Next.js | 16.2.1 — App Router. Read `node_modules/next/dist/docs/` before writing any Next.js code. APIs may differ from your training data. |
| React | 19.2.4 |
| TypeScript | Strict mode. Zero `any`. Zero type errors before commit. |
| Supabase | Auth + Postgres + RLS + Storage (`@supabase/ssr ^0.10`, `@supabase/supabase-js ^2.101`) |
| Tailwind CSS | v4 — syntax differs from v3. Use CSS variables in `globals.css`. |
| shadcn/ui | radix-nova style. Components live in `src/components/ui/`. Never modify them directly. |
| Resend | Transactional email |
| next-intl | i18n — en, de, fr, pt |
| Zod | v4 (`^4.3.6`) — schema API differs from v3. Check docs before use. |
| react-hook-form | `^7.72.0` with `@hookform/resolvers ^5.2.2` |

## Critical Rules

### 1. Code Organization

- Many small files over few large files
- High cohesion, low coupling
- 200-400 lines typical, 800 max per file
- Organize by feature/domain, not by type

### 2. Code Style

- No emojis in code, comments, or documentation
- Immutability always - never mutate objects or arrays
- No console.log in production code
- Proper error handling with try/catch
- Input validation with Zod or similar

### 3. Testing

- TDD: Write tests first
- 80% minimum coverage
- Unit tests for utilities
- Integration tests for APIs
- E2E tests for critical flows

### 4. Security

- No hardcoded secrets
- Environment variables for sensitive data
- Validate all user inputs
- Parameterized queries only
- CSRF protection enabled

## File Structure

```
src/
|-- app/              # Next.js app router
|-- components/       # Reusable UI components
|-- hooks/            # Custom React hooks
|-- lib/              # Utility libraries
|-- types/            # TypeScript definitions
```

## Key Patterns

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### Error Handling

```typescript
try {
  const result = await operation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { success: false, error: 'User-friendly message' }
}
```

## Environment Variables

```bash
# Required
DATABASE_URL=
API_KEY=

# Optional
DEBUG=false
```

## Available Commands

- `/tdd` - Test-driven development workflow
- `/plan` - Create implementation plan
- `/code-review` - Review code quality
- `/build-fix` - Fix build errors

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Never commit to main directly
- PRs require review
- All tests must pass before merge