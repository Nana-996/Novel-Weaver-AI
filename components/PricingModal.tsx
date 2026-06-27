import React, { useState } from 'react';
import type { UserProfile } from '../services/authService';
import { getAccessToken } from '../services/authService';
import { getTierInfo } from '../services/usageService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  userProfile: UserProfile | null;
  onTierChanged: (newTier: string) => void;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceAmount: number;
  interval: string;
  features: string[];
  highlight?: boolean;
  cta: string;
  emoji: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'GHS 0',
    priceAmount: 0,
    interval: 'forever',
    emoji: '✍️',
    cta: 'Current Plan',
    features: [
      '15 messages per day',
      '2 story projects',
      'Story Memory auto-extract',
      'TXT export',
      'Cloud sync',
    ],
  },
  {
    id: 'writer',
    name: 'Writer',
    price: 'GHS 20',
    priceAmount: 20,
    interval: 'month',
    emoji: '📖',
    highlight: true,
    cta: 'Upgrade to Writer',
    features: [
      '100 messages per day',
      '10 story projects',
      'Story Memory auto-extract',
      'PDF, DOCX & TXT export',
      'Cloud sync',
    ],
  },
  {
    id: 'novelist',
    name: 'Novelist',
    price: 'GHS 50',
    priceAmount: 50,
    interval: 'month',
    emoji: '🏆',
    cta: 'Go Novelist',
    features: [
      'Unlimited messages',
      'Unlimited projects',
      'Story Memory auto-extract',
      'All export formats',
      'Cloud sync',
      'Priority support (coming soon)',
    ],
  },
];

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, currentTier, userProfile, onTierChanged }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentTier) return;

    setLoading(planId);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Please sign in to upgrade.');
        setLoading(null);
        return;
      }

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start payment.');
        setLoading(null);
        return;
      }

      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setError(err.message || 'Payment error.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl overlay-content-enter">
        <div className="bg-ink rounded-2xl border border-ink-400/15 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-8 pt-8 pb-2 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-warm/[0.05] blur-[80px] rounded-full" />
            <div className="relative">
              <h2 className="text-2xl font-display font-semibold text-parchment tracking-tight">
                Choose Your Plan
              </h2>
              <p className="text-sm text-parchment-dim/70 mt-1">
                Unlock your full creative potential
              </p>
            </div>
          </div>

          {/* Plans grid */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.id === currentTier;
                const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentTier);

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border p-5 transition-all ${
                      plan.highlight
                        ? 'border-warm/30 bg-warm/[0.04] shadow-lg shadow-warm/5'
                        : isCurrent
                          ? 'border-sage/30 bg-sage/[0.03]'
                          : 'border-ink-400/15 bg-ink-100/30 hover:border-ink-400/25'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-warm text-ink text-[10px] font-semibold uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}

                    {/* Plan header */}
                    <div className="text-center mb-4">
                      <span className="text-2xl">{plan.emoji}</span>
                      <h3 className="text-lg font-display font-semibold text-parchment mt-1">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-2xl font-display font-bold text-parchment">{plan.price}</span>
                        {plan.priceAmount > 0 && (
                          <span className="text-xs text-parchment-faint ml-1">/{plan.interval}</span>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-parchment-dim">
                          <span className="text-sage flex-shrink-0 mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCurrent || isDowngrade || loading !== null}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isCurrent
                          ? 'bg-sage/10 text-sage border border-sage/20 cursor-default'
                          : isDowngrade
                            ? 'bg-ink-200/50 text-parchment-faint cursor-not-allowed'
                            : plan.highlight
                              ? 'bg-warm hover:bg-warm-light text-ink hover:scale-[1.02] active:scale-[0.98]'
                              : 'bg-ink-200 hover:bg-ink-300 text-parchment hover:scale-[1.02] active:scale-[0.98]'
                      } disabled:opacity-60`}
                    >
                      {loading === plan.id
                        ? 'Redirecting...'
                        : isCurrent
                          ? '✓ Current Plan'
                          : isDowngrade
                            ? 'Downgrade not available'
                            : plan.cta
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top-Up Banner */}
          {userProfile && currentTier !== 'novelist' && (
            <div className="px-6 pb-6">
              <div className="bg-ink-200/50 border border-ink-400/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-parchment flex items-center gap-2">
                    <span className="text-lg">🔋</span> Need a quick boost?
                  </h4>
                  <p className="text-xs text-parchment-dim mt-0.5">
                    Hit your daily limit? Get 50 extra messages instantly. No subscription required.
                  </p>
                </div>
                <button
                  onClick={() => handleUpgrade('topup')}
                  disabled={loading !== null}
                  className="whitespace-nowrap px-4 py-2 bg-sage hover:bg-sage-light text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading === 'topup' ? 'Redirecting...' : 'Top Up GHS 10'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-6 pb-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <p className="text-[10px] text-parchment-faint/40">
              Payments powered by Paystack · Cancel anytime
            </p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm text-parchment-dim hover:text-parchment hover:bg-ink-200/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
