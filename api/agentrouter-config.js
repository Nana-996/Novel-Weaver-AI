export const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
export const AGENTROUTER_BASE_URL = 'https://agentrouter.org/v1/chat/completions';
export const DEFAULT_MODEL = 'claude-opus-5';
export const SUPPORTED_MODELS = [
  'claude-opus-5',
  'gpt-5.6-sol',
  'deepseek-v4-flash',
  'glm-5.3',
  'claude-opus-4-8',
];

export function getAgentRouterHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AGENTROUTER_API_KEY}`,
    'User-Agent': 'claude-cli/1.0.83 (external, cli)',
    'anthropic-version': '2023-06-01',
  };
}

