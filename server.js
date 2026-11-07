'use strict';
// Local / self-hosted server. Serves the site AND the API from one origin, so the
// session cookie works with no CORS setup:  npm start  ->  http://localhost:5000
require('dotenv').config();
const path = require('path');
const express = require('express');
const { handle } = require('./lib/api');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
app.disable('x-powered-by');
app.set('trust proxy', 1);

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
}

// Optional: only needed if the web pages are hosted on a different origin than this API.
app.use('/api', (req, res, next) => {
    const origin = process.env.CORS_ORIGIN;
    if (origin && req.headers.origin === origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use('/api', express.json({ limit: '8mb' }));

app.use('/api', async (req, res) => {
    const out = await handle({
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        cookies: parseCookies(req.headers.cookie),
        secure: req.secure
    });
    if (out.cookies) res.setHeader('Set-Cookie', out.cookies);
    if (out.redirect) return res.redirect(out.status || 302, out.redirect);
    if (out.binary) {
        res.status(out.status || 200);
        res.setHeader('Content-Type', out.binary.type);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', out.cache || 'no-store');
        return res.end(out.binary.buf);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(out.status || 200).json(out.json);
});

// JSON body errors (too large / malformed)
app.use('/api', (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 400;
    res.status(status).json({ success: false, message: status === 413 ? 'That upload is too large.' : 'Invalid request.' });
});

// Static site — only the folders/files the website needs. Nothing else in this
// directory (scripts, lib, .env, backups, package files) is ever served.
['css', 'js', 'img', 'fonts'].forEach((dir) => {
    app.use('/' + dir, express.static(path.join(__dirname, dir), { dotfiles: 'deny', index: false }));
});
app.get(/^\/([A-Za-z0-9_-]+\.html)$/, (req, res) => res.sendFile(path.join(__dirname, req.params[0])));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`SokoHub running on http://localhost:${PORT}  (data: TiDB)`));
