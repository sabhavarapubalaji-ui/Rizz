# Rizz — What if fashion flirts

A complete runnable full-stack clothing store based on the supplied Rizz Visualized Documentation and Royal Master Build Prompt.

## Included
- Royal responsive storefront
- Shirts, Pants, T-Shirts and Dresses
- Search, category filters and sorting
- Product detail + variants + stock validation
- Local customer registration/login with hashed passwords
- Cart and checkout
- COD orders fully functional
- Optional Razorpay integration structure for UPI/card online payments
- SQLite database with seeded demo products
- Protected admin dashboard for products, stock and order status
- Customer order history
- Owner order-email workflow (SMTP when configured; console fallback for development)
- No raw card/CVV storage

## Run locally
1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and change `JWT_SECRET` and `ADMIN_PASSWORD`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

The first run creates `server/rizz.sqlite` and seeds demo products.

## Admin
The admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on first startup. Change both before deployment.

Admin URL: `http://localhost:3000/admin.html`

## Email
Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in `.env`. Orders are always stored; if SMTP is not configured, the complete order notification is printed to the server console so local development remains usable.

## Online payments
COD works immediately. For UPI/debit/credit-card payments, configure Razorpay test/live credentials in `.env`. The browser receives only the public key; the secret stays server-side. The project never stores card numbers or CVV.

For production, configure HTTPS, a real domain, strong secrets, rate limiting/WAF, backups, image storage, and Razorpay webhook/signature verification before accepting live payments.

## Source basis
The supplied documents specify the Rizz brand/caption, categories, customer journey, admin workflow, data model, page structure, security expectations, email recipient, inventory rules, and acceptance tests. This implementation follows those requirements while using a simple Node/Express + SQLite architecture for easy local deployment.
