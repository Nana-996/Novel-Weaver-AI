// Vercel Serverless Function: /api/extract-notes
// Extracts story notes from conversation using OpenRouter (non-streaming)

import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  // CORS headers (must be set before any method checks)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured.' });
  }

  // Auth check (if Supabase configured)
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const user = await verifyUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
  }

  const { messages, currentNotes } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
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

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://novel-weaver.app',
        'X-Title': 'Novel Weaver AI - Story Extraction',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `AI service error (${response.status})` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content in AI response' });
    }

    // Parse JSON — handle markdown code fences
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.idea !== 'string' || typeof parsed.characters !== 'string' ||
        typeof parsed.plot !== 'string' || typeof parsed.outline !== 'string') {
      return res.status(500).json({ error: 'Invalid response structure from AI' });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Extract notes error:', error);
    return res.status(500).json({ error: `Extraction failed: ${error.message}` });
  }
}
