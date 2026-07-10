// netlify/functions/log-solve.js
//
// Receives a solve (or an updated solutions count) from the browser and
// upserts it into Supabase. This is the ONLY thing on the server side
// that's allowed to touch the database directly — the browser never sees
// the Supabase service-role key, only this function does (via env vars).
//
// Env vars needed (set in Netlify: Site configuration → Environment variables):
//   SUPABASE_URL              — from Supabase: Project Settings → API
//   SUPABASE_SERVICE_ROLE_KEY — same page — KEEP SECRET, never ship to the client

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Basic shape/sanity checks — this is what stands between the public
// internet and your database, so don't trust anything from the client.
function validatePayload(body){
  if (typeof body.puzzleDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.puzzleDate)){
    return 'Invalid puzzleDate';
  }
  if (typeof body.clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.clientId)){
    return 'Invalid clientId';
  }
  if (!Number.isInteger(body.timeMs) || body.timeMs <= 0 || body.timeMs > 24 * 60 * 60 * 1000){
    return 'Invalid timeMs';
  }
  if (!Number.isInteger(body.solutionsCount) || body.solutionsCount < 1 || body.solutionsCount > 1000){
    return 'Invalid solutionsCount';
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e){
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const validationError = validatePayload(body);
  if (validationError){
    return { statusCode: 400, body: validationError };
  }

  // Upsert: first solve of the day inserts a row; later calls (more
  // solutions found in explore mode) update the same row instead of
  // creating duplicates. time_ms only ever reflects the FIRST win — we
  // don't overwrite it on later exploration submits.
  const { data: existing, error: fetchError } = await supabase
    .from('solves')
    .select('id, time_ms, solutions_count')
    .eq('puzzle_date', body.puzzleDate)
    .eq('client_id', body.clientId)
    .maybeSingle();

  if (fetchError){
    return { statusCode: 500, body: 'Database error: ' + fetchError.message };
  }

  if (existing){
    const { error: updateError } = await supabase
      .from('solves')
      .update({
        solutions_count: Math.max(existing.solutions_count, body.solutionsCount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError){
      return { statusCode: 500, body: 'Database error: ' + updateError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from('solves')
      .insert({
        puzzle_date: body.puzzleDate,
        client_id: body.clientId,
        time_ms: body.timeMs,
        solutions_count: body.solutionsCount,
      });

    if (insertError){
      return { statusCode: 500, body: 'Database error: ' + insertError.message };
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
