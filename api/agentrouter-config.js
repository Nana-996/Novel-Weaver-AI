export const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY || '';
export const AGENTROUTER_BASE_URL = 'https://agentrouter.org/v1/chat/completions';
export const DEFAULT_MODEL = 'claude-opus-4-8';

export function getAgentRouterHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AGENTROUTER_API_KEY}`,
    'User-Agent': 'claude-cli/1.0.83 (external, cli)',
    'anthropic-version': '2023-06-01',
  };
}
