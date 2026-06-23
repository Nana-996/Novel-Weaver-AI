export const config = {
  runtime: 'edge',
};

import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Tier limits
const TIER_LIMITS = {
  free: { messagesPerDay: 15 },
  writer: { messagesPerDay: 100 },
  novelist: { messagesPerDay: Infinity },
};

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function verifyUser(authHeader) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function checkUsage(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { allowed: true, tier: 'free', used: 0, limit: 15 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = profile?.tier || 'free';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const used = usage?.message_count || 0;
  const allowed = used < limits.messagesPerDay;

  return { allowed, tier, used, limit: limits.messagesPerDay };
}

async function incrementUsage(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('usage')
    .select('id, message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('usage')
      .update({ message_count: existing.message_count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage')
      .insert({ user_id: userId, date: today, message_count: 1 });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI service not configured.' }), { status: 500, headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization');
  let userId = null;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders });
    }
    userId = user.id;

    const usage = await checkUsage(userId);
    if (!usage.allowed) {
      return new Response(JSON.stringify({
        error: `Daily message limit reached (${usage.used}/${usage.limit}). Upgrade your plan.`,
        usage
      }), { status: 429, headers: corsHeaders });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders });
  }

  const { messages, model, temperature, topP } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), { status: 400, headers: corsHeaders });
  }

  try {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Start background fetch WITHOUT awaiting it before returning
    (async () => {
      let isDone = false;
      const heartbeatInterval = setInterval(() => {
        if (!isDone) {
          // Send an SSE comment to keep the connection alive on mobile/Vercel
          writer.write(new TextEncoder().encode(': ping\n\n')).catch(() => {});
        }
      }, 3000);

      try {
        const openRouterResponse = await fetch(OPENROUTER_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://novel-weaver.app',
            'X-Title': 'Novel Weaver AI',
          },
          body: JSON.stringify({
            model: model || 'nvidia/nemotron-3-ultra-550b-a55b:free',
            messages,
            temperature: temperature ?? 0.7,
            top_p: topP ?? 0.95,
            stream: true,
          }),
        });

        clearInterval(heartbeatInterval);
        isDone = true;

        if (!openRouterResponse.ok) {
          let errorMsg = `AI service error (${openRouterResponse.status})`;
          try {
            const errData = await openRouterResponse.json();
            errorMsg = errData.error?.message || errData.message || errorMsg;
          } catch { /* ignore */ }
          
          const encoder = new TextEncoder();
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          await writer.close();
          return;
        }

        if (userId) {
          incrementUsage(userId).catch(err => console.error('Usage tracking error:', err));
        }

        const reader = openRouterResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (error) {
        console.error('Background fetch error:', error);
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
      } finally {
        clearInterval(heartbeatInterval);
        isDone = true;
        await writer.close();
      }
    })();

    // Return IMMEDIATELY to bypass 10s timeout limits!
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Chat API start error:', error);
    return new Response(JSON.stringify({ error: `Failed to start stream: ${error.message}` }), { status: 500, headers: corsHeaders });
  }
}
