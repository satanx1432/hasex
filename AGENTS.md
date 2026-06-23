<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Behavioral OS Project-Specific Rules

### Development Commands
- Start dev server: `npm run dev` (run from behavioral-os directory)
- Build: `npm run build`
- Lint: `npm run lint`

### Technology Stack Notes
- **Tailwind CSS v4**: Uses CSS-based configuration in `globals.css`, not traditional tailwind.config.js
- **Next.js 16**: Uses App Router with latest React 19
- **Design System**: Implemented from Stitch Kinetic Behavioral OS specs (monochrome, Inter + JetBrains Mono fonts)
- **TypeScript**: Strict mode enabled

### Key Design Principles
- High-contrast typography on dark backgrounds (#0A0A0A)
- 640px max-width central column layout
- Minimal animations (breathing effects)
- Glassmorphism for transient elements
- Material Symbols Outlined icons

### AI Integration
- NVIDIA NIM models are structured in `src/lib/ai/nvidia-nim.ts`
- Currently using simulated responses - needs API keys for production
- Three model types: Nemotron 4B, Kimik2.6, GLM 5.1

### Database Structure
- Supabase PostgreSQL schema defined in PROJECT_README
- Tables: goals, micro_actions, action_completions, bos_insights
- Authentication via Supabase Auth (not yet implemented)

### File Structure
- Components in `src/components/` organized by feature areas
- Routes organized in `src/app/` with logical grouping
- Main app routes in `src/app/app/` (dashboard, actions, focus, etc.)
- Authentication routes in `src/app/auth/`
- Onboarding routes in `src/app/onboarding/`
- Types defined in `src/types/index.ts`
- Utilities in `src/lib/` for Supabase and AI services

### Email Rate Limit Issues
If you encounter Supabase email rate limits:
1. Disable email verification in Supabase Dashboard → Authentication → Providers → Email
2. Use magic links instead (implemented in login component)
3. Switch to a custom SMTP provider in Supabase settings
4. For testing, disable confirmation emails temporarily

### Environment Setup
- See `ENV_SETUP.md` for required environment variables
- Needs: Supabase URL/keys, NVIDIA NIM API key/endpoint
