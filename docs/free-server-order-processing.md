# Free server-side order processing

The public order forms submit to Next.js Route Handlers:

- `POST /api/orders` — validates an individual order, reloads catalog and settings from Firestore, calculates the authoritative totals, and creates the order, tracking record, and sequential counter in one server-side transaction.
- `POST /api/group-orders` — validates a group order and creates it server-side.

The browser no longer has permission to create documents directly in `orders`, `order_number_counters`, `order_tracking`, or `group_orders`. Admin access remains unchanged. Public order tracking by order number remains read-only.

## Required environment variable

Set `FIREBASE_SERVICE_ACCOUNT_JSON` in the hosting provider's server-side environment variables. It must contain the complete JSON key for a dedicated Firebase service account with the minimum Firestore data access role needed by this app (Cloud Datastore User / Firestore data access). Do not use a personal account key, do not expose it as a `NEXT_PUBLIC_*` variable, and never commit it to Git.

For Netlify:

1. Open the site's **Project configuration → Environment variables**.
2. Add `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Paste the complete service-account JSON as the value and mark it secret if the UI offers that option.
4. Set its scope to the production and deploy-preview contexts that you actually use.
5. Trigger a deploy after the variable is saved.

The project can build without this secret, but order submission will return HTTP 503 until it is configured. This avoids making the build depend on a production credential.

## Free plan guardrail

Netlify Free currently includes 300 monthly credits and has a hard usage limit. Keep auto-recharge disabled (the Free plan does not offer automatic recharge). Monitor the usage page; when the monthly limit is reached, Netlify may pause the project until the next billing cycle. No paid service is required by this code.

## Important migration sequence

1. Configure the secret on the Netlify site.
2. Deploy this app to Netlify and verify both API endpoints using test orders.
3. Only after the server endpoints are verified, deploy the Firestore rules in this branch. The rules deny direct public writes and route all new orders through the server API.
4. Do not remove the existing Vercel deployment until Netlify production is verified.

Firebase Admin SDK bypasses Firestore Security Rules. Therefore, every field, price, setting, schedule, payment choice, deposit, and uploaded URL must be validated by the server before any write. Never trust browser-supplied totals or product/settings snapshots.

This change does not use Firebase Storage. Existing Cloudinary uploads remain unchanged.
