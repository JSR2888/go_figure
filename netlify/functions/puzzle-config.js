// netlify/functions/puzzle-config.js
//
// Hands the browser the two Supabase values that are DESIGNED to be
// public (the project URL and the anon key — protected by Row Level
// Security, not by secrecy) so script.js never needs them hardcoded.
// Never put SUPABASE_SERVICE_ROLE_KEY or SUPABASE_JWT_SECRET here — those
// two stay server-only, used only by log-solve.js.
//
// These env vars are auto-injected by the Supabase Netlify extension:
//   SUPABASE_DATABASE_URL — bare project URL (renamed from the
//                           extension's own SUPABASE_URL to dodge its
//                           /rest/v1/ suffix — see log-solve.js)
//   SUPABASE_ANON_KEY     — the public anon key, safe to expose

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey){
    return { statusCode: 500, body: 'Supabase config env vars missing' };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // These rarely change — fine for the browser/CDN to cache briefly.
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ supabaseUrl, supabaseAnonKey }),
  };
};
