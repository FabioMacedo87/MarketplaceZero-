# PublicaFix

PublicaFix is currently a free beta for static inspection of Windows Batch (.cmd / .bat) and PowerShell (.ps1) scripts.

## What works in this beta

- Upload or paste a text script up to 32 KB.
- Run nine heuristic static checks.
- Review findings with severity, line reference, explanation and remediation.
- Copy or download a plain-text report.
- Account registration and login UI backed by Supabase Auth, after environment configuration.
- Subscription backend prepared for Stripe-hosted monthly Checkout, customer billing portal and signed webhooks. The payment buttons remain disabled until the business plans and all live configuration values are approved and present.

## Static analysis limitations

The analysis engine is deterministic and does not execute submitted content. Files are read by the browser and their text is sent to the PublicaFix API for in-memory analysis. The API does not write uploaded scripts to disk or persist them.

Static checks are heuristic. They can produce false positives and false negatives and are not a security certification. A clean report does not prove a script is safe. Review every finding and test scripts in an isolated environment.

## Subscription design

- Supabase Auth identifies users; a database trigger creates their profile.
- Row Level Security lets users read and update only their own profile and read only their own subscription state.
- Billing customer mappings, raw Stripe subscription references and webhook event IDs are blocked from browser roles.
- Checkout is server-side and uses a fixed allowlist of plan-to-Price IDs. The browser cannot submit an arbitrary Stripe Price ID.
- The backend accepts only a Stripe live secret key and verifies that each selected Price is active, recurring monthly, denominated in EUR and in live mode.
- Access state is updated only from signed Stripe webhooks. The browser cannot grant itself a paid plan.
- Webhook events are recorded by unique event ID to handle repeated delivery.
- The customer portal is used for subscription and payment-method management.
- The commercial launch switch PUBLICAFIX_LIVE_BILLING_ENABLED must remain false until the plans, inclusions, prices and tax treatment are confirmed. This is a launch control, not a payment test mode.

No live Price objects, webhook endpoint, Stripe secrets, customer portal configuration or production deployment have been created by this code change.

## Required server environment

See .env.example for the full list.

Server-only values:
- SUPABASE_URL
- SUPABASE_SECRET_KEY
- STRIPE_SECRET_KEY (must start with sk_live_)
- STRIPE_WEBHOOK_SECRET\n- STRIPE_BILLING_PORTAL_CONFIGURATION (PublicaFix portal: bpc_1Ug9Gr2VZXUfhutCKuxTaC3c)
- STRIPE_PRICE_ESSENCIAL
- STRIPE_PRICE_PROFISSIONAL
- STRIPE_PRICE_EMPRESARIAL
- APP_URL
- PUBLICAFIX_LIVE_BILLING_ENABLED

Browser build values:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

The subscription buttons remain disabled unless the server is configured with a live Stripe account, valid webhook secret, three valid live EUR monthly Prices, Supabase server credentials, a public HTTPS URL and the explicit commercial launch switch.

## Email authentication

Email/password sign-up uses Supabase Auth email confirmation. Configure the deployed PublicaFix HTTPS URL under Supabase Authentication URL Configuration. For public launch, configure a dependable custom SMTP provider: Supabase's default email service is rate-limited and intended for trying the service, not a public launch.

## Development

Requirements: Node.js 22+.

- npm install
- npm run dev
- npm test
- npm run lint
- npm run build

The Express server exposes the script audit API, account billing routes and the Stripe webhook.
