# Rizz deployment checklist

## Local
- `npm install`
- copy `.env.example` to `.env`
- set a long random `JWT_SECRET`
- set a strong `ADMIN_PASSWORD`
- `npm start`

## Before production
1. Deploy Node app on a host supporting persistent SQLite, or migrate the SQL statements to PostgreSQL/MySQL.
2. Put the app behind HTTPS.
3. Configure SMTP and verify delivery to `arjunchandu2311@gmail.com`.
4. Configure Razorpay test keys, complete test payments, then switch to live keys only after verification.
5. Add Razorpay webhook/signature verification before treating online orders as paid.
6. Replace remote demo image URLs with your own licensed product images and preferably object storage/CDN.
7. Add rate limiting, CSRF strategy where appropriate, logging/monitoring, database backups, and a secret manager.
8. Change the initial admin password immediately.
