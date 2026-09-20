# Morocco Graduation Web

SEO-first public web application for Morocco Graduation.

## Principles

- Public users never need accounts.
- Admin authentication is private and separate.
- Existing Firebase/Firestore data model remains the source of truth during migration.
- Public pages are server-rendered or statically generated wherever possible.
- SEO, structured data, sitemap, robots rules, Core Web Vitals and AI crawler accessibility are first-class requirements.
- No paid service is mandatory for the application to function.

## Local development

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_SITE_URL` to the production domain when known.
