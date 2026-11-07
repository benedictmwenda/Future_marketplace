# SokoHub on TiDB — apply guide

Everything the site stores now lives in TiDB: users, sessions, listings, listing photos,
cart, wishlist, orders, contact messages, newsletter. The browser keeps only an HttpOnly
session cookie (no localStorage / IndexedDB / Firebase / local files).

## 1. Apply
Copy these files over your project, then delete the files listed in DELETED.txt.
`git rm database-backup.json` and **purge it from git history** (it holds user emails, phones and password hashes).

## 2. Rotate secrets (do first)
`.env` was committed in older commits and the DB password is in your history/zip. In TiDB Cloud reset the
password, put the new one in `.env` (local) and in Netlify -> Site settings -> Environment variables
(DB_HOST, DB_PORT=4000, DB_USER, DB_PASSWORD, DB_NAME). Also rotate the old Aiven password.

## 3. Prepare the database (once)
    npm install
    npm run setup-db          # creates/upgrades all tables, lower-cases emails
    npm run migrate-images -- --dry-run
    npm run migrate-images    # moves base64 photos into listing_images
    npm run make-admin -- you@example.com

## 4. Run
    npm start                 # http://localhost:5000  (site + API, same origin)
Netlify: push; /api/* is served by netlify/functions/api.js. Check https://<site>/api/health -> {"db":"ok"}.

## Behaviour changes
- Wrong login shows one generic message; 10 failed attempts / 15 min locks that email.
- Admin / ownership checks use the server session, not an email sent by the browser.
- Registering can only create buyer/seller accounts; admins via `make-admin`.
- Listing photos: JPG/PNG/WebP/GIF, max 8 photos, 1.5 MB each.
- Checkout now stores an order (Pending). No real payment is taken — M-Pesa/card are not integrated yet.

## Also changed
- Listing text fields are escaped when drawn on the page and `<` `>` are stripped on save (stored-XSS fix).
- Passwords need 8+ characters (matches the sign-up form). Existing shorter passwords still work for login.
- Sellers can no longer set their own promotion tier; admins set it from the admin dashboard.
