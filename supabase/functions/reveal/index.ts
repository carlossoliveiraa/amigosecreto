// Supabase Edge Function example (TypeScript)
// Place under supabase/functions/reveal/index.ts and deploy via Supabase CLI.
// This function uses the Supabase service role key (set as env var in Supabase) and Twilio env vars.

import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // keep secret
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

serve(async (req) => {
  try {
    const body = await req.json();
    const { box_id, revealer_name, revealer_phone } = body;
    if (!box_id || !revealer_name || !revealer_phone) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // Transactional reveal implemented with SQL function for atomicity is recommended.
    // Here we'll implement a simple transaction using Supabase client.

    // 1) check if phone already used
    const { data: used, error: usedErr } = await supabase
      .from('revelations')
      .select('id')
      .eq('revealer_phone', revealer_phone)
      .limit(1);
    if (usedErr) throw usedErr;
    if (used && used.length) return new Response(JSON.stringify({ error: 'Telefone já usou uma revelação.' }), { status: 400 });

    // 2) pick random name not in boxes.revealed_name
    const { data: available, error: availErr } = await supabase.rpc('get_random_unrevealed_name');
    if (availErr) throw availErr;
    const chosen = available?.name || null;
    if (!chosen) return new Response(JSON.stringify({ error: 'Nenhum nome disponível.' }), { status: 400 });

    // 3) update boxes and insert revelation
    const { error: updErr } = await supabase
      .from('boxes')
      .update({ revealed_name: chosen, locked: true })
      .eq('id', box_id)
      .eq('revealed_name', null);
    if (updErr) throw updErr;

    const { error: insErr } = await supabase
      .from('revelations')
      .insert([{ box_id, revealer_name, revealer_phone, revealed_name: chosen }]);
    if (insErr) throw insErr;

    // optional: send SMS to revealer
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
      const bodyData = new URLSearchParams({
        From: TWILIO_FROM,
        To: revealer_phone,
        Body: `Você abriu uma caixinha! Seu amigo secreto: ${chosen}`
      });

      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyData
      });
    }

    return new Response(JSON.stringify({ assignedName: chosen }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
});
