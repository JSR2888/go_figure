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

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      SUPABASE_URL: redact(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY),
      nodeVersion: process.version,
    }, null, 2),
  };
};
