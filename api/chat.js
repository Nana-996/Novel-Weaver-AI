// Vercel Serverless Function: /api/chat
// Proxies chat requests to OpenRouter with auth + rate limiting
// This keeps the OpenRouter API key server-side only

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

// Create Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Verify the user's JWT and return user info
async function verifyUser(authHeader) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Check usage and get tier
async function checkUsage(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { allowed: true, tier: 'free', used: 0, limit: 15 };

  // Get user's tier from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = profile?.tier || 'free';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Get today's usage
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

// Increment usage count
async function incrementUsage(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const today = new Date().toISOString().split('T')[0];

  // Upsert: insert or increment
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

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check API key is configured
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured. Please set OPENROUTER_API_KEY in environment variables.' });
  }

  // Authenticate user (if Supabase is configured)
  const authHeader = req.headers.authorization;
  let userId = null;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(authHeader);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    userId = user.id;

    // Check rate limits
    const usage = await checkUsage(userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: `Daily message limit reached (${usage.used}/${usage.limit}). Upgrade your plan for more messages.`,
        usage,
      });
    }
  }

  const { messages, model, temperature, topP } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

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
        model: model || 'nvidia/nemotron-3-super-120b-a12b:free',
        messages,
        temperature: temperature ?? 0.7,
        top_p: topP ?? 0.95,
        stream: true,
      }),
    });

    if (!openRouterResponse.ok) {
      let errorMsg = `AI service error (${openRouterResponse.status})`;
      try {
        const errData = await openRouterResponse.json();
        errorMsg = errData.error?.message || errData.message || errorMsg;
      } catch { /* ignore */ }
      return res.status(openRouterResponse.status).json({ error: errorMsg });
    }

    // Increment usage after successful connection (before streaming)
    if (userId) {
      incrementUsage(userId).catch(err => console.error('Usage tracking error:', err));
    }

    // Stream the SSE response back to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = openRouterResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
    } finally {
      res.end();
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: `Failed to connect to AI service: ${error.message}` });
  }
}
