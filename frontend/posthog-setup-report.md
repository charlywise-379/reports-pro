<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Omni Reports / Reports PRO Next.js App Router project. PostHog is initialized in `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), which means it starts tracking the moment any page loads — no provider wrapper needed. A reverse proxy was configured in `next.config.ts` so all PostHog traffic routes through `/ingest`, improving reliability and ad-blocker bypass. Environment variables are stored in `.env.local` and referenced via `process.env.NEXT_PUBLIC_POSTHOG_*` throughout the codebase.

**User identification** is wired up at all three entry points: registration (`posthog.identify` fires with the Supabase user ID and email right after `signUp` succeeds), login (fires after `signInWithPassword` succeeds), and the dashboard load (re-identifies the session user on every visit so server-generated Supabase sessions are correlated with PostHog).

**Events** are captured in the event handlers themselves — never in `useEffect` reacting to state — following PostHog and React best practices. Exception capture (`posthog.captureException`) was added to registration errors and Stripe checkout/upgrade failures.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully registers. Fires after Supabase `signUp` with no error. | `app/register/page.tsx` |
| `user_logged_in` | User authenticates successfully with email/password. | `app/login/page.tsx` |
| `login_failed` | Login attempt fails (wrong credentials). | `app/login/page.tsx` |
| `onboarding_step_completed` | User advances between onboarding steps. Includes step number, label, company name, and industry. | `app/onboarding/page.tsx` |
| `onboarding_completed` | User finishes the 7-step wizard and activates. Includes company, industry, frequency, channel, and competitor count. | `app/onboarding/page.tsx` |
| `checkout_initiated` | User clicks to start a Stripe checkout session. Includes plan key, billing cycle, price, and reactivation flag. | `app/checkout/page.tsx` |
| `checkout_cancelled` | User lands on the cancel page after abandoning Stripe. | `app/checkout/cancel/page.tsx` |
| `subscription_activated` | Stripe session verified as paid/active after polling. Top of payment conversion funnel. | `app/checkout/success/page.tsx` |
| `upgrade_initiated` | Existing subscriber triggers a plan change. Includes plan key, billing cycle, and price. | `app/upgrade/page.tsx` |
| `report_generated` | User triggers a new AI report from the dashboard. Includes project ID, frequency, and company name. | `app/dashboard/page.tsx` |
| `report_downloaded` | User downloads a report PDF. Includes report ID. | `app/dashboard/page.tsx` |
| `colleagues_invited` | User sends report-sharing invitations. Includes invite count. | `app/dashboard/page.tsx` |
| `trial_expired_viewed` | User sees the trial-expired blocking screen. Top of the re-activation funnel. | `app/dashboard/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](https://us.posthog.com/project/451921/dashboard/1661596)
- [New Signups Over Time](https://us.posthog.com/project/451921/insights/nqv8IuKF) — daily registration trend
- [Signup → Activation Funnel](https://us.posthog.com/project/451921/insights/RgcIvJnW) — registration → onboarding → checkout
- [Payment Conversion Funnel](https://us.posthog.com/project/451921/insights/UU7jJqEc) — checkout initiated → subscription activated
- [Report Generation Activity](https://us.posthog.com/project/451921/insights/vkBFd0XK) — reports generated and downloaded per week
- [Trial Expiry & Checkout Cancellations](https://us.posthog.com/project/451921/insights/TzVgWwg4) — churn signals per week

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
