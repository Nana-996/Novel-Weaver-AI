export const maxDuration = 60;

import { createClient } from '@supabase/supabase-js';
import { AGENTROUTER_API_KEY, AGENTROUTER_BASE_URL, DEFAULT_MODEL, SUPPORTED_MODELS, getAgentRouterHeaders } from './agentrouter-config.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

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

  const token = authHeader.replace(/^Bearer\s+/i, '');
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

async function parseRequest(req) {
  const method = req.method || 'GET';
  
  let authHeader = '';
  if (req.headers) {
    if (typeof req.headers.get === 'function') {
      authHeader = req.headers.get('authorization') || '';
    } else {
      authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    }
  }

  let body = null;
  if (req.body) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch {}
    } else if (Buffer.isBuffer(req.body)) {
      try { body = JSON.parse(req.body.toString('utf-8')); } catch {}
    }
  }

  if (!body && typeof req.json === 'function') {
    try { body = await req.json(); } catch {}
  }

  if (!body && typeof req.text === 'function') {
    try {
      const text = await req.text();
      body = JSON.parse(text);
    } catch {}
  }

  if (!body && req.on && typeof req.on === 'function') {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
      req.on('error', () => resolve(null));
    });
  }

  return { method, authHeader, body };
}

export default async function handler(req, res) {
  const isNode = Boolean(res && (typeof res.writeHead === 'function' || typeof res.status === 'function'));

  const sendJsonResponse = (status, data) => {
    if (isNode) {
      if (typeof res.status === 'function' && typeof res.json === 'function') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(status).json(data);
      }
      res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  const { method, authHeader, body } = await parseRequest(req);

  if (method === 'OPTIONS') {
    if (isNode) {
      if (typeof res.status === 'function') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
      }
      res.writeHead(200, corsHeaders);
      res.end();
      return;
    }
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (method !== 'POST') {
    return sendJsonResponse(405, { error: 'Method not allowed' });
  }

  if (!AGENTROUTER_API_KEY) {
    return sendJsonResponse(500, {
      error: 'AI service not configured: AGENTROUTER_API_KEY is missing in server environment variables. Please add AGENTROUTER_API_KEY in your Vercel Project Settings.'
    });
  }

  let userId = null;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(authHeader);
    if (!user) {
      return sendJsonResponse(401, { error: 'Authentication required. Please sign in to chat.' });
    }
    userId = user.id;

    const usage = await checkUsage(userId);
    if (!usage.allowed) {
      return sendJsonResponse(429, {
        error: `Daily message limit reached (${usage.used}/${usage.limit}). Upgrade your plan to continue.`,
        usage
      });
    }
  }

  if (!body || !body.messages || !Array.isArray(body.messages)) {
    return sendJsonResponse(400, { error: 'Invalid request: messages array required' });
  }

  const { messages, model, temperature, topP } = body;
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
          errorMsg = (typeof errData.error === 'string' ? errData.error : errData.error?.message) || errData.message || errorMsg;
        } catch { /* ignore */ }

        console.warn(`Model ${currentModel} failed (${aiResponse.status}): ${errorMsg}. Trying fallback...`);
        lastErrorMsg = errorMsg;
        lastStatus = aiResponse.status;
        continue;
      }

      if (userId) {
        incrementUsage(userId).catch(err => console.error('Usage tracking error:', err));
      }

      if (isNode) {
        res.writeHead(200, {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        if (aiResponse.body) {
          const reader = aiResponse.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        }
        res.end();
        return;
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

  return sendJsonResponse(lastStatus, { error: lastErrorMsg });
}


