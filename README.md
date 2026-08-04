# LeadIQ AI

LeadIQ AI is an interactive real-estate lead qualification dashboard. It scores prospects from their budget, buying timeline, and acquisition source, then turns the result into a clear sales priority and recommended next action.

## Live demo

[Open the deployed LeadIQ AI dashboard](https://leadiq-ai-xtiz-pearl.vercel.app)

Recruiter demo account:

- Email: `demo@leadiq.ai`
- Password: `LeadIQDemo2026!`

The demo workspace uses a confirmed Supabase account. Leads added through it are stored in PostgreSQL and remain available after signing out and signing back in.

## Features

- Deterministic AI-style lead scoring with Hot, Warm, and Cold categories
- New-lead qualification form with instant score, status, and recommendation
- Search and temperature filters with live result counts
- Detailed lead profile drawer with a personalized follow-up action
- Working workspace views for automations, sources, analytics, and settings
- Notification panel with actionable pipeline updates
- CSV export for the currently visible lead results
- Bulk CSV import with row validation, automatic scoring, and secure persistence
- Supabase email/password authentication with protected workspace access
- Per-user persistent leads secured with Row Level Security
- Six-stage sales pipeline with persistent stage changes
- Complete lead editing and deletion
- Per-lead private notes, follow-up tasks, and activity history
- Responsive dashboard layout for desktop and mobile screens

## Verified interactions

| Control | Expected result |
| --- | --- |
| Overview | Selects the main dashboard view |
| Lead intelligence | Selects the lead workspace and displays the lead table |
| Automations | Shows active Hot-lead and nurture automation rules |
| Sources | Shows the active lead count for every acquisition source |
| Analytics | Shows average score, urgent leads, and qualification rate |
| Settings | Shows scoring and workspace administrator configuration |
| Notifications | Opens the pipeline notification panel; its close button dismisses it |
| Qualify new lead | Opens the qualification form and adds the scored lead |
| View hot leads / Hot | Filters the table to Hot leads |
| All / Warm / Cold | Displays leads in the selected qualification category |
| Search | Filters leads by name, email, location, or source |
| Export | Downloads the visible results as a CSV file |
| Import CSV | Validates, scores, and permanently saves multiple leads at once |
| Lead row / arrow | Opens the matching AI lead profile |
| Create personalized follow-up | Creates a visible follow-up confirmation for that lead |

## Scoring model

The portfolio demo does not require a paid AI token. It assigns points using three transparent signals:

- Budget: higher purchase budgets receive more points.
- Timeline: prospects buying sooner receive more points.
- Source: referrals and website leads receive stronger intent weighting.

Scores of 80 or more are **Hot**, 60–79 are **Warm**, and scores below 60 are **Cold**. This makes the demo reliable, explainable, and free to run.

## Technology

- Next.js 16
- React 19
- TypeScript
- CSS
- Supabase Auth and PostgreSQL
- Vinext and Cloudflare tooling for portable deployment support
- Vercel for the production deployment

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`, then add the project URL and publishable anon key from Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Run [`supabase/migrations/202607310001_create_leads.sql`](supabase/migrations/202607310001_create_leads.sql) in the Supabase SQL editor. The migration creates the leads table, enables Row Level Security, and restricts every record to its authenticated owner.

Then run [`supabase/migrations/202608040001_crm_foundation.sql`](supabase/migrations/202608040001_crm_foundation.sql). It adds pipeline stages plus owner-protected notes, tasks, and activity records. Apply migrations in filename order.

For a Vercel-compatible production check:

```bash
npx next build
```

## Future improvements

- Add multi-user team workspaces and role invitations
- Add Resend-powered email delivery, templates, and delivery webhooks
- Replace the local scoring function with an AI API
- Send qualified leads and follow-ups to GoHighLevel through webhooks

## Author

Muhammad Dawood
