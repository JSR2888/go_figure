// netlify/functions/debug-env.js
//
// TEMPORARY diagnostic — delete this file once the "Invalid path specified
// in request URL" issue is resolved. It reveals no secrets (values are
// redacted to length + first/last few characters) but there's no reason to
// leave a diagnostic endpoint sitting on a production site indefinitely.
//
// Visit https://<your-site>/.netlify/functions/debug-env in a browser
// after deploying this, and paste the JSON response back.

function redact(value){
  if (!value) return { present: false, length: 0, preview: null };
  const str = String(value);
  return {
    present: true,
    length: str.length,
    // Shows enough to spot stray whitespace/newlines/quotes without
    // exposing the actual secret.
    startsWith: JSON.stringify(str.slice(0, 12)),
    endsWith: JSON.stringify(str.slice(-6)),
    looksTrimmed: str === str.trim(),
  };
}

// A JWT's payload (the middle of its three dot-separated segments) is only
// base64-encoded, not encrypted — decoding it reveals claims like "role"
// and "ref" without needing the secret that SIGNED it. Safe to expose;
// this is NOT the same as exposing the key itself.
function decodeJwtPayload(token){
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'Not a JWT (expected 3 dot-separated segments)' };
  try {
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e){
    return { error: 'Failed to decode: ' + e.message };
  }
}

exports.handler = async () => {
  const serviceKeyPayload = decodeJwtPayload(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      SUPABASE_DATABASE_URL: redact(process.env.SUPABASE_DATABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY),
      // The important one: this tells us whether the key is ACTUALLY
      // service_role, or something else (anon, or an extension-scoped key).
      serviceKeyClaims: serviceKeyPayload,
      nodeVersion: process.version,
    }, null, 2),
  };
};
