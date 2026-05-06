import type { Settings } from '../types';

const getSystemInstruction = (settings: Settings['ai']) => `You are Novel Weaver, an AI novel-writing partner. You help people turn rough story ideas into fully written novels through warm, collaborative conversation. You don't just plan — you actively write scenes, draft chapters, and develop the manuscript alongside the user.

Your personality:
- You are like a co-author and friend who is also an expert novelist. You get genuinely excited about bringing stories to life.
- You celebrate ideas, no matter how rough or unformed. Every great novel started as a messy thought.
- You NEVER make the user feel stupid or inexperienced. You meet them where they are.
- You explain craft concepts naturally in conversation — never lecture.
- You are warm, encouraging, and honest. When something needs improvement, you say so kindly and offer to rewrite it.
- You use a casual, approachable tone. Feel like a real person, not a writing textbook.

YOUR PRIMARY JOB IS TO WRITE:
- You are not just a planning tool. You actively produce written prose — scenes, chapters, dialogue, descriptions.
- When discussing a scene or plot point, proactively offer: "Want me to draft this scene?" or "I can write the opening — want to see it?"
- When writing, produce high-quality prose with vivid sensory details, varied sentence structures, strong verbs, and meaningful subtext.
- Don't describe what a scene should contain in bullet points when you could just WRITE the scene.
- Always keep momentum toward getting words on the page. Plans are great, but the goal is a finished novel.

CRITICAL MEMORY RULES:
- Each user message may include a [STORY MEMORY] block with XML tags. These contain the ABSOLUTE TRUTH of the story.
- You MUST NEVER contradict anything in <story_idea>, <plot_summary>, <characters>, <chapter_outline>, or <manuscript_progress>.
- If <user_corrections> are present, those represent mistakes YOU made that the user fixed. NEVER repeat those patterns.
- If <earlier_conversation_summary> is present, it summarizes older messages. Use it to maintain continuity.
- If <manuscript_progress> is present, you know exactly what has already been written. Continue from where it left off. Never rewrite what already exists unless explicitly asked.

Your core approach:
1.  **Write, don't just advise**: When a story moment is clear enough, write it. Draft the scene. Show, don't tell about showing.
2.  **Guide without overwhelming**: Help the user take one step at a time. Don't dump all of story structure on them at once.
3.  **Perfect Memory & Consistency**: Remember ALL story details. The user should NEVER have to remind you of anything.
4.  **Story Context Tags**: When you see XML tags like <characters>, <plot_summary>, etc., treat their content as established canon.
5.  **Adhere to User Preferences**:
    -   **Writing Style**: ${settings.writingStyle}
    -   **Tone**: ${settings.tonePreference}
    -   **Default Chapter Length**: Aim for approximately ${settings.defaultChapterLength} words per chapter.
6.  **Chapter Generation**: When writing a chapter, start with "Chapter X: [Title]" on its own line, followed by full prose content.
7.  **Celebrate and Build**: When the user makes a decision or shares an idea, acknowledge it, then push forward: "Great choice! Want me to write the opening scene based on this?"
8.  **Move Ideas to Pages**: When brainstorming, don't stay in planning mode too long. After key decisions, offer to write. The transition from "talking about the story" to "writing the story" should feel natural and exciting.
9.  **Track Story Facts**: Keep all characters, locations, and plot points consistent in every response.
10. **Proactive Co-Author**: After writing a chapter or scene, suggest what to write next. Keep the momentum going.
11. **Honest Editor**: When asked to review, give specific, constructive feedback — and offer to rewrite the weak parts.
12. **Scene-Level Writing**: You can write full scenes within conversation, not just chapters. If the user wants to explore a moment, write a 300-500 word scene draft right there.`;


// Get the Gemini API key from environment or settings
const getGeminiApiKey = (): string => {
  return (
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (window as any).__GEMINI_API_KEY__ ||
    localStorage.getItem('novel-weaver-gemini-key') ||
    ''
  );
};

// Model configurations
export const AVAILABLE_MODELS = [
  { id: 'claude-opus-4-6', label: '🧠 Claude Opus 4.6', description: 'Advanced AI Model' },
  { id: 'gemini-2.0-flash', label: '⚡ Gemini 2.0 Flash', description: 'Fast & capable' },
  { id: 'gemini-2.0-flash-lite', label: '🪶 Gemini 2.0 Flash Lite', description: 'Lightweight & fast' },
  { id: 'gemini-1.5-flash', label: '⚡ Gemini 1.5 Flash', description: 'Reliable workhorse' },
  { id: 'gemini-1.5-pro', label: '🧠 Gemini 1.5 Pro', description: 'Most capable (lower limits)' },
];

interface CreateChatParams {
  history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
  settings: Settings['ai'];
}

export interface GeminiChat {
  sendMessageStream: (params: { message: string }) => AsyncGenerator<{ text: string }, void, unknown>;
}

// Keep the old name for backward compatibility
export type OpenRouterChat = GeminiChat;

class GeminiChatImpl implements GeminiChat {
  private model: string;
  private history: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
  private settings: Settings['ai'];

  constructor(model: string, history: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>, settings: Settings['ai']) {
    this.model = model;
    this.history = history;
    this.settings = settings;
  }

  async *sendMessageStream(params: { message: string }): AsyncGenerator<{ text: string }, void, unknown> {
    yield* this._attemptStream(params, 0);
  }

  private async *_attemptStream(params: { message: string }, attempt: number): AsyncGenerator<{ text: string }, void, unknown> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error('No Gemini API key found. Go to Settings (⚙️) and add your free API key from Google AI Studio.');
    }

    const isAgentRouter = !this.model.startsWith('gemini-');
    const systemInstruction = getSystemInstruction(this.settings);

    let url: string;
    let headers: Record<string, string>;
    let requestBody: any;

    if (isAgentRouter) {
      url = '/api/agentrouter/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...this.history.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts.map(p => p.text).join('')
          })),
          { role: 'user', content: params.message }
        ],
        temperature: this.settings.temperature,
        top_p: this.settings.topP,
        stream: true
      };
    } else {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse`;
      headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      };
      requestBody = {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          ...this.history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: msg.parts,
          })),
          {
            role: 'user',
            parts: [{ text: params.message }],
          },
        ],
        generationConfig: {
          temperature: this.settings.temperature,
          topK: this.settings.topK,
          topP: this.settings.topP,
        },
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', errorText);

        // Auto-retry for server errors
        if (response.status >= 500 && response.status < 600) {
          if (attempt < 2) {
            console.log(`Server error ${response.status} (attempt ${attempt + 1}), retrying in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            yield* this._attemptStream(params, attempt + 1);
            return;
          }
          throw new Error(`Gemini server is temporarily unavailable (Error ${response.status}). Please try again in a moment.`);
        }

        // Rate limit
        if (response.status === 429) {
          if (attempt < 1) {
            console.log(`Rate limited, retrying in 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            yield* this._attemptStream(params, attempt + 1);
            return;
          }
          throw new Error('Rate limit reached. Gemini free tier allows 15 requests/minute & 1,500/day. Wait a moment and try again, or switch to a different model.');
        }

        // API key errors
        if (response.status === 400 || response.status === 403) {
          try {
            const errorObj = JSON.parse(errorText);
            const msg = errorObj.error?.message || errorText;
            if (msg.includes('API_KEY') || msg.includes('API key') || response.status === 403) {
              throw new Error('Invalid API key. Please check your Gemini API key in Settings (⚙️). Get a free key at aistudio.google.com.');
            }
            throw new Error(`API Error: ${msg}`);
          } catch (e: any) {
            if (e.message.includes('API key') || e.message.includes('API Error')) throw e;
            throw new Error(`API Error: ${response.status} - ${errorText}`);
          }
        }

        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = isAgentRouter 
                ? parsed.choices?.[0]?.delta?.content 
                : parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { text };
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      if (
        error.message?.includes('API key') ||
        error.message?.includes('API Error') ||
        error.message?.includes('Rate limit') ||
        error.message?.includes('unavailable') ||
        error.message?.includes('No Gemini')
      ) {
        throw error;
      }
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }
}

export const createChat = (params: CreateChatParams): GeminiChat => {
  const model = params.settings.model;
  return new GeminiChatImpl(model, params.history || [], params.settings);
};