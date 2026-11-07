'use strict';
// Netlify Function: the whole /api/* surface (see netlify.toml redirects).
const { handle } = require('../../lib/api');

function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach((part) => {
        const i = part.indexOf('=');
        if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
}

exports.handler = async function (event) {
    const headers = event.headers || {};
    const origin = headers.origin || headers.Origin;
    const cors = {};
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
        Object.assign(cors, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            Vary: 'Origin'
        });
    }
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

    let body = {};
    if (event.body) {
        try {
            const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
            body = JSON.parse(raw);
        } catch (e) {
            return { statusCode: 400, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, message: 'Invalid request.' }) };
        }
    }

    const path = String(event.path || '').replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
    const out = await handle({
        method: event.httpMethod,
        path,
        query: event.queryStringParameters || {},
        body,
        cookies: parseCookies(headers.cookie || headers.Cookie),
        secure: (headers['x-forwarded-proto'] || 'https') === 'https'
    });

    const res = { statusCode: out.status || 200, headers: { ...cors } };
    if (out.cookies) res.multiValueHeaders = { 'Set-Cookie': out.cookies };
    if (out.redirect) {
        res.headers.Location = out.redirect;
        res.body = '';
    } else if (out.binary) {
        res.headers['Content-Type'] = out.binary.type;
        res.headers['X-Content-Type-Options'] = 'nosniff';
        res.headers['Cache-Control'] = out.cache || 'no-store';
        res.isBase64Encoded = true;
        res.body = Buffer.from(out.binary.buf).toString('base64');
    } else {
        res.headers['Content-Type'] = 'application/json';
        res.headers['Cache-Control'] = 'no-store';
        res.body = JSON.stringify(out.json);
    }
    return res;
};
