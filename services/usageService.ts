import { supabase } from './supabaseClient';

// ============================================================
// Usage Service — tracks daily message counts per user
// ============================================================

export interface UsageInfo {
  messagesUsed: number;
  messagesLimit: number;
  tier: 'free' | 'writer' | 'novelist';
  percentUsed: number;
  isAtLimit: boolean;
  isNearLimit: boolean; // > 80%
}

const TIER_LIMITS: Record<string, number> = {
  free: 15,
  writer: 100,
  novelist: Infinity,
};

export function getTierLimit(tier: string): number {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export async function getUsageToday(userId: string, tier: string): Promise<UsageInfo> {
  const baseLimit = getTierLimit(tier);

  if (!supabase) {
    // If no Supabase, use localStorage tracking
    return getLocalUsage(tier);
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('usage')
      .select('message_count, bonus_messages')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const used = data?.message_count || 0;
    const bonus = data?.bonus_messages || 0;
    const totalLimit = baseLimit === Infinity ? Infinity : baseLimit + bonus;
    
    const percentUsed = totalLimit === Infinity ? 0 : Math.round((used / totalLimit) * 100);

    return {
      messagesUsed: used,
      messagesLimit: totalLimit,
      tier: tier as UsageInfo['tier'],
      percentUsed,
      isAtLimit: used >= totalLimit,
      isNearLimit: totalLimit !== Infinity && used >= totalLimit * 0.8,
    };
  } catch {
    return getLocalUsage(tier);
  }
}

// Fallback: track usage in localStorage when offline/no Supabase
function getLocalUsage(tier: string): UsageInfo {
  const limit = getTierLimit(tier);
  const today = new Date().toISOString().split('T')[0];
  const key = `novel-weaver-usage-${today}`;

  let used = 0;
  try {
    used = parseInt(localStorage.getItem(key) || '0', 10);
  } catch { /* ignore */ }

  const percentUsed = limit === Infinity ? 0 : Math.round((used / limit) * 100);

  return {
    messagesUsed: used,
    messagesLimit: limit,
    tier: tier as UsageInfo['tier'],
    percentUsed,
    isAtLimit: used >= limit,
    isNearLimit: limit !== Infinity && used >= limit * 0.8,
  };
}

export function incrementLocalUsage(): void {
  const today = new Date().toISOString().split('T')[0];
  const key = `novel-weaver-usage-${today}`;
  try {
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
  } catch { /* ignore */ }
}

// Get tier display info
export function getTierInfo(tier: string): { name: string; color: string; badge: string } {
  switch (tier) {
    case 'novelist':
      return { name: 'Novelist', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'writer':
      return { name: 'Writer', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    default:
      return { name: 'Free', color: 'text-parchment-faint', badge: 'bg-ink-200 text-parchment-dim border-ink-400/20' };
  }
}
