export const maxDuration = 60;

import { createClient } from '@supabase/supabase-js';
import { AGENTROUTER_API_KEY, AGENTROUTER_BASE_URL, DEFAULT_MODEL, SUPPORTED_MODELS, getAgentRouterHeaders } from './agentrouter-config.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const EXTRACTION_SYSTEM_PROMPT = `You are a story analysis assistant. Your ONLY job is to extract and organize story information from conversations into a structured format.

You will receive:
1. The current Story Memory (what's already been captured)
2. Recent conversation messages between a writer and their AI writing partner

Your task: Analyze the conversation and UPDATE the Story Memory with any new or changed information. You must MERGE new info with existing notes — never delete existing information unless it was explicitly contradicted or changed.

RESPOND WITH ONLY VALID JSON in this exact format (no markdown, no code fences, no explanation):
{
  "idea": "The core premise/concept of the novel. Include genre, setting era, central conflict, themes, and tone.",
  "characters": "All characters mentioned. For each: name, role, key traits, motivations, relationships, arc. Use line breaks between characters.",
  "plot": "The main story arc, key plot points, conflicts, twists, subplots. Structure as a narrative summary.",
  "outline": "Chapter-by-chapter plan if discussed. Format as: Chapter 1: [Title] - [Summary]. One per line."
}

CRITICAL RULES:
- PRESERVE all existing information. Only ADD or UPDATE, never remove.
- If a field has no new information, return the existing content unchanged.
- If a field is empty and the conversation has relevant info, fill it in.
- Be thorough — capture every character name, plot detail, theme, and structural element mentioned.
- Keep the language clear and organized — this is a reference document, not prose.
- If the conversation only contains greetings or meta-discussion with no story content, return all fields unchanged.`;

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
    return sendJsonResponse(500, { error: 'AI service not configured: AGENTROUTER_API_KEY is missing.' });
  }

  // Auth check (if Supabase configured)
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(authHeader);
    if (!user) {
      return sendJsonResponse(401, { error: 'Authentication required.' });
    }
  }

  if (!body) {
    return sendJsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { messages, currentNotes } = body;

  if (!messages || !Array.isArray(messages)) {
    return sendJsonResponse(400, { error: 'Invalid request: messages array required' });
  }

  // Build context
  const currentMemory = `CURRENT STORY MEMORY:
---
IDEA: ${currentNotes?.idea || '(empty)'}
---
CHARACTERS: ${currentNotes?.characters || '(empty)'}
---
PLOT: ${currentNotes?.plot || '(empty)'}
---
OUTLINE: ${currentNotes?.outline || '(empty)'}
---`;

  const conversationText = messages.map(m => {
    const label = m.role === 'user' ? 'WRITER' : 'AI PARTNER';
    return `${label}: ${m.text}`;
  }).join('\n\n');

  const userPrompt = `${currentMemory}\n\nRECENT CONVERSATION:\n${conversationText}\n\nAnalyze the conversation above and return the updated Story Memory as JSON. Remember: MERGE new information with existing — never delete what's already there.`;

  const candidateModels = [
    DEFAULT_MODEL,
    ...SUPPORTED_MODELS.filter(m => m !== DEFAULT_MODEL)
  ];

  let lastErrorMsg = 'Extraction failed';
  let lastStatus = 500;

  for (const currentModel of candidateModels) {
    try {
      const response = await fetch(AGENTROUTER_BASE_URL, {
        method: 'POST',
        headers: getAgentRouterHeaders(),
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || contentType.includes('text/html')) {
        let errText = '';
        try {
          const text = await response.text();
          if (text.includes('aliyun_waf') || text.includes('captcha') || text.includes('<!doctype') || text.includes('<html')) {
            errText = 'Security challenge triggered by gateway. Retrying fallback model...';
          } else {
            try {
              const errData = JSON.parse(text);
              errText = (typeof errData.error === 'string' ? errData.error : errData.error?.message) || errData.message || '';
            } catch {
              if (text.length < 300) errText = text;
            }
          }
        } catch { /* ignore */ }
        console.warn(`Extract notes model ${currentModel} failed (${response.status}): ${errText}. Trying fallback...`);
        lastErrorMsg = errText || `AI service error (${response.status})`;
        lastStatus = response.status;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        lastErrorMsg = 'No content in AI response';
        continue;
      }

      // Parse JSON — handle markdown code fences
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      if (typeof parsed.idea !== 'string' || typeof parsed.characters !== 'string' ||
          typeof parsed.plot !== 'string' || typeof parsed.outline !== 'string') {
        lastErrorMsg = 'Invalid response structure from AI';
        continue;
      }

      return sendJsonResponse(200, parsed);
    } catch (error) {
      console.warn(`Extract notes error with ${currentModel}:`, error);
      lastErrorMsg = `Extraction failed: ${error.message}`;
    }
  }

  return sendJsonResponse(lastStatus, { error: lastErrorMsg });
}


