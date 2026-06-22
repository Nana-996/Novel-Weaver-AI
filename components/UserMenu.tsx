import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '../services/authService';
import type { UsageInfo } from '../services/usageService';
import { getTierInfo } from '../services/usageService';
import { signOut } from '../services/authService';

interface UserMenuProps {
  profile: UserProfile;
  usage: UsageInfo | null;
  onSignOut: () => void;
  onOpenPricing: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ profile, usage, onSignOut, onOpenPricing }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tierInfo = getTierInfo(profile.tier);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get initials
  const initials = profile.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-ink-200/50 transition-colors group"
        id="btn-user-menu"
      >
        {/* Avatar */}
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="w-7 h-7 rounded-lg object-cover border border-ink-400/20"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-warm/10 border border-warm/20 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-warm">{initials}</span>
          </div>
        )}

        {/* Tier badge */}
        <span className={`hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full border ${tierInfo.badge}`}>
          {tierInfo.name}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-ink rounded-xl border border-ink-400/20 shadow-xl z-50 overlay-content-enter overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-ink-400/10">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-xl object-cover border border-ink-400/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-warm/10 border border-warm/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-warm">{initials}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-parchment truncate">{profile.displayName}</p>
                <p className="text-[11px] text-parchment-faint truncate">{profile.email}</p>
              </div>
            </div>
          </div>

          {/* Usage */}
          {usage && (
            <div className="px-4 py-3 border-b border-ink-400/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-parchment-faint">Today's messages</span>
                <span className="text-[11px] font-medium text-parchment-dim">
                  {usage.messagesUsed}/{usage.messagesLimit === Infinity ? '∞' : usage.messagesLimit}
                </span>
              </div>
              {usage.messagesLimit !== Infinity && (
                <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usage.isAtLimit ? 'bg-red-500' :
                      usage.isNearLimit ? 'bg-amber-500' :
                      'bg-warm/60'
                    }`}
                    style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                  />
                </div>
              )}
              {usage.isNearLimit && !usage.isAtLimit && (
                <p className="text-[10px] text-amber-600 mt-1">Running low — consider upgrading</p>
              )}
              {usage.isAtLimit && (
                <p className="text-[10px] text-red-500 mt-1">Daily limit reached</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            {profile.tier === 'free' && (
              <button
                onClick={() => { onOpenPricing(); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-warm/8 transition-colors group"
              >
                <span className="text-sm">✨</span>
                <div>
                  <span className="text-sm text-warm font-medium">Upgrade Plan</span>
                  <p className="text-[10px] text-parchment-faint">Get more messages & features</p>
                </div>
              </button>
            )}
            {profile.tier !== 'free' && (
              <button
                onClick={() => { onOpenPricing(); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-ink-200/50 transition-colors"
              >
                <span className="text-sm">📋</span>
                <span className="text-sm text-parchment-dim">Manage Subscription</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-ink-200/50 transition-colors"
            >
              <span className="text-sm">👋</span>
              <span className="text-sm text-parchment-dim">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
