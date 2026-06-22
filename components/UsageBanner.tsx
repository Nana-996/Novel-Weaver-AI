import React from 'react';
import type { UsageInfo } from '../services/usageService';

interface UsageBannerProps {
  usage: UsageInfo | null;
  onUpgrade: () => void;
}

const UsageBanner: React.FC<UsageBannerProps> = ({ usage, onUpgrade }) => {
  if (!usage) return null;

  // Don't show for unlimited tiers
  if (usage.messagesLimit === Infinity) return null;

  // Show when near limit (>80%) or at limit
  if (!usage.isNearLimit && !usage.isAtLimit) return null;

  if (usage.isAtLimit) {
    return (
      <div className="mx-auto max-w-3xl mb-2 animate-slide-up">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
          <span className="text-sm flex-shrink-0">⚡</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-600 font-medium">
              You've used all {usage.messagesLimit} messages for today
            </p>
            <p className="text-[10px] text-red-500/70 mt-0.5">
              Your limit resets at midnight. Upgrade for more messages.
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-warm hover:bg-warm-light text-ink text-xs font-medium transition-all hover:scale-105"
          >
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  // Near limit warning
  const remaining = usage.messagesLimit - usage.messagesUsed;
  return (
    <div className="mx-auto max-w-3xl mb-2 animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-500/6 border border-amber-500/12">
        <span className="text-xs flex-shrink-0">💬</span>
        <p className="text-[11px] text-amber-700 flex-1">
          <span className="font-medium">{remaining} message{remaining !== 1 ? 's' : ''} left</span> today
          <span className="text-amber-600/60"> · </span>
          <button
            onClick={onUpgrade}
            className="text-warm hover:text-warm-light font-medium underline underline-offset-2 transition-colors"
          >
            Upgrade for more
          </button>
        </p>
      </div>
    </div>
  );
};

export default UsageBanner;
