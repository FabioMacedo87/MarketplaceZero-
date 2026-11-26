# PublicaFix

PublicaFix is currently a free beta for **static inspection** of Windows Batch (.cmd / .bat) and PowerShell (.ps1) scripts.

## What works in this beta

- Upload or paste a text script up to 32 KB.
- Run nine heuristic static checks.
- Review findings with severity, line reference, explanation and remediation.
- Copy or download a plain-text report.

The analysis engine is deterministic and does not execute submitted content. Files are read by the browser and their text is sent to the PublicaFix API for in-memory analysis. The API does not write uploaded scripts to disk or persist them.

## What is deliberately unavailable

- Customer accounts and login.
- Persistent workspaces, saved reports and team data.
- Paid plans, Stripe Checkout, renewals and invoices.
- Remote script execution, signing, publishing or rollback.

The plan cards display indicative prices only. Purchase buttons are disabled. The API returns an unavailable response for billing, account and execution endpoints. Do not advertise these features as active.

## Safety and limitations

Static checks are heuristic. They can produce false positives and false negatives and are not a security certification. A clean report does not prove a script is safe. Review every finding and test scripts in an isolated environment.

Never place Stripe keys, database credentials or other secrets in this public repository. Configure secrets only in the hosting provider's server-side environment after the corresponding feature is implemented and tested.

## Development

Requirements: Node.js 22+.

- npm install
- npm run dev
- npm test
- npm run lint
- npm run build

The Express server exposes /api/health, /api/initial-script and POST /api/audit-script.
