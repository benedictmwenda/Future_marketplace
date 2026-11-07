// Promotes an existing account to admin.  Usage: npm run make-admin -- you@example.com
require('dotenv').config();
const { getPool, ensureSchema } = require('../lib/db');
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: npm run make-admin -- you@example.com'); process.exit(1); }
(async () => {
    const p = getPool();
    await ensureSchema();
    const [r] = await p.query("UPDATE users SET role = 'admin' WHERE LOWER(email) = ?", [email]);
    console.log(r.affectedRows ? `${email} is now an admin.` : `No account found for ${email} — sign up on the site first.`);
    await p.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
