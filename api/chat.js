export const maxDuration = 60;

import { createClient } from '@supabase/supabase-js';
import { AGENTROUTER_API_KEY, AGENTROUTER_BASE_URL, DEFAULT_MODEL, SUPPORTED_MODELS, getAgentRouterHeaders } from './agentrouter-config.js';
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
    .select('message_count, bonus_messages')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const used = usage?.message_count || 0;
  const bonus = usage?.bonus_messages || 0;
  const totalLimit = limits.messagesPerDay === Infinity ? Infinity : limits.messagesPerDay + bonus;
  
  const allowed = used < totalLimit;

  return { allowed, tier, used, limit: totalLimit };
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

  if (!AGENTROUTER_API_KEY) {
    return new Response(JSON.stringify({
      error: 'AI service not configured: AGENTROUTER_API_KEY is missing in server environment variables. Please add AGENTROUTER_API_KEY in your Vercel Project Settings.'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const authHeader = req.headers.get('authorization');
  let userId = null;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required. Please sign in to chat.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    userId = user.id;

    const usage = await checkUsage(userId);
    if (!usage.allowed) {
      return new Response(JSON.stringify({
        error: `Daily message limit reached (${usage.used}/${usage.limit}). Upgrade your plan to continue.`,
        usage
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { messages, model, temperature, topP } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const requestedModel = (model && SUPPORTED_MODELS.includes(model)) ? model : DEFAULT_MODEL;
  
  // Build candidate order: user requested model first, then remaining supported models
  const candidateModels = [
    requestedModel,
    ...SUPPORTED_MODELS.filter(m => m !== requestedModel)
  ];

  let lastErrorMsg = 'AI generation failed';
  let lastStatus = 500;

  for (const currentModel of candidateModels) {
    try {
      const payload = {
        model: currentModel,
        messages,
        stream: true,
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(typeof topP === 'number' ? { top_p: topP } : {}),
      };

      const aiResponse = await fetch(AGENTROUTER_BASE_URL, {
        method: 'POST',
        headers: getAgentRouterHeaders(),
        body: JSON.stringify(payload),
      });

      if (!aiResponse.ok) {
        let errorMsg = `AI service error (${aiResponse.status})`;
        try {
          const errData = await aiResponse.json();
          errorMsg = errData.error?.message || errData.message || errData.error || errorMsg;
        } catch { /* ignore */ }

        console.warn(`Model ${currentModel} failed (${aiResponse.status}): ${errorMsg}. Trying fallback...`);
        lastErrorMsg = errorMsg;
        lastStatus = aiResponse.status;
        continue;
      }

      if (userId) {
        incrementUsage(userId).catch(err => console.error('Usage tracking error:', err));
      }

      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } catch (error) {
      console.warn(`Error with model ${currentModel}: ${error.message}. Trying fallback...`);
      lastErrorMsg = `AI request failed: ${error.message}`;
    }
  }

  // All candidates failed
  return new Response(JSON.stringify({ error: lastErrorMsg }), {
    status: lastStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

