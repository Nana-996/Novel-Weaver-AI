import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../services/authService';
import { getAccessToken } from '../services/authService';
import { getTierInfo } from '../services/usageService';
import { validatePromoCode } from '../services/promotionService';
import type { PromotionValidationResult } from '../services/promotionService';
import { openPaystackCheckout } from '../services/paystackService';
import { XIcon, SparklesIcon } from './Icons';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  userProfile: UserProfile | null;
  onTierChanged: (newTier: string) => void;
  initialPromoCode?: string;
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

const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  userProfile,
  onTierChanged,
  initialPromoCode = '',
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState(initialPromoCode);
  const [appliedPromo, setAppliedPromo] = useState<PromotionValidationResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    if (initialPromoCode && isOpen) {
      setPromoCodeInput(initialPromoCode);
      handleApplyPromo(initialPromoCode);
    }
  }, [initialPromoCode, isOpen]);

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoError(null);
      setPromoSuccess(null);
      return;
    }

    setIsValidatingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      // Validate against writer plan as baseline (GHS 20)
      const res = await validatePromoCode(code, 'all', 20);
      if (res.valid) {
        setAppliedPromo(res);
        setPromoSuccess(res.message || 'Promotion applied successfully!');
      } else {
        setAppliedPromo(null);
        setPromoError(res.message || 'Invalid promotion code.');
      }
    } catch (e: any) {
      setPromoError('Failed to validate promo code.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    setError(null);

    const customerEmail = userProfile?.email || 'test.author@novelweaver.app';
    const customerId = userProfile?.id || 'guest_user';

    const baseAmount = tier === 'topup' ? 10 : tier === 'novelist' ? 50 : 20;
    let finalAmount = baseAmount;

    if (appliedPromo) {
      if (appliedPromo.discountType === 'percentage') {
        const discount = (baseAmount * (appliedPromo.discountValue || 0)) / 100;
        finalAmount = Math.max(0, baseAmount - discount);
      } else if (appliedPromo.discountType === 'fixed_amount') {
        finalAmount = Math.max(0, baseAmount - (appliedPromo.discountValue || 0));
      } else if (appliedPromo.isFreeGrant) {
        finalAmount = 0;
      }
    }

    // Direct free promotion unlock (100% discount)
    if (finalAmount === 0 && appliedPromo) {
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tier,
            promo_code: appliedPromo.promotion?.code,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (data.freeGrant || response.ok) {
          onTierChanged(data.tier || tier);
          alert(data.message || '🎉 Promotion redeemed successfully! Your tier has been upgraded.');
          onClose();
          return;
        }
      } catch (e) {
        // Local fallback
      }
      onTierChanged(tier);
      alert('🎉 Free promotion activated!');
      onClose();
      return;
    }

    // Launch Paystack Checkout
    await openPaystackCheckout({
      tier: tier as any,
      userEmail: customerEmail,
      userId: customerId,
      amountGHS: finalAmount,
      promo: appliedPromo,
      onSuccess: (res) => {
        setLoading(null);
        onTierChanged(res.tier);
        alert(`🎉 Payment successful! You are now subscribed to the ${res.tier.toUpperCase()} plan.`);
        onClose();
      },
      onCancel: () => {
        setLoading(null);
      },
      onError: (errMsg) => {
        setError(errMsg);
        setLoading(null);
      },
    });
    setLoading(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90dvh] flex flex-col bg-ink rounded-2xl border border-ink-400/20 shadow-2xl overflow-hidden overlay-content-enter">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 p-2 text-parchment-faint hover:text-parchment hover:bg-ink-200/50 rounded-xl transition-colors"
          title="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative px-6 pt-6 sm:pt-8 pb-2 text-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-warm/[0.05] blur-[80px] rounded-full pointer-events-none" />
          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-parchment tracking-tight">
              Choose Your Plan
            </h2>
            <p className="text-xs sm:text-sm text-parchment-dim/70 mt-1">
              Unlock your full creative potential
            </p>
          </div>
        </div>

        {/* Scrollable container for plans and top-up */}
        <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">
          
          {/* Promo Code Input Bar */}
          <div className="px-6 pt-4 pb-2">
            <div className="bg-ink-100/70 border border-ink-400/15 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-base">🏷️</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-parchment">Have a special promotion code?</p>
                  <p className="text-[10px] text-parchment-faint">Enter code for instant discounts or free bonuses</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. WELCOME50"
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleApplyPromo(); }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-ink-50 border border-ink-400/20 text-parchment font-mono focus:outline-none focus:border-warm uppercase w-full sm:w-36"
                />
                <button
                  onClick={() => handleApplyPromo()}
                  disabled={isValidatingPromo || !promoCodeInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-warm hover:bg-warm-light text-white text-xs font-semibold transition-all disabled:opacity-50 whitespace-nowrap shadow-sm"
                >
                  {isValidatingPromo ? 'Checking...' : 'Apply'}
                </button>
              </div>
            </div>

            {promoSuccess && (
              <p className="text-[11px] text-sage font-medium mt-1.5 flex items-center gap-1">
                <span>✓</span> {promoSuccess}
              </p>
            )}
            {promoError && (
              <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                <span>✕</span> {promoError}
              </p>
            )}
          </div>

          {/* Plans grid */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.id === currentTier;
                const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentTier);

                // Calculate discounted price if promo applied
                let displayPrice = plan.price;
                let originalPriceStrike: string | null = null;
                let ctaText = plan.cta;

                if (appliedPromo && plan.priceAmount > 0) {
                  if (appliedPromo.discountType === 'percentage') {
                    const discount = (plan.priceAmount * (appliedPromo.discountValue || 0)) / 100;
                    const finalVal = Math.max(0, plan.priceAmount - discount);
                    displayPrice = `GHS ${finalVal}`;
                    originalPriceStrike = plan.price;
                    ctaText = `Upgrade for GHS ${finalVal} (${appliedPromo.discountValue}% OFF)`;
                  } else if (appliedPromo.discountType === 'fixed_amount') {
                    const finalVal = Math.max(0, plan.priceAmount - (appliedPromo.discountValue || 0));
                    displayPrice = `GHS ${finalVal}`;
                    originalPriceStrike = plan.price;
                    ctaText = `Upgrade for GHS ${finalVal}`;
                  } else if (appliedPromo.isFreeGrant) {
                    displayPrice = 'FREE';
                    originalPriceStrike = plan.price;
                    ctaText = 'Claim Free Promo Upgrade';
                  }
                }

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
                      <div className="mt-2 flex items-baseline justify-center gap-1.5">
                        {originalPriceStrike && (
                          <span className="text-sm text-parchment-faint line-through">{originalPriceStrike}</span>
                        )}
                        <span className="text-2xl font-display font-bold text-parchment">{displayPrice}</span>
                        {plan.priceAmount > 0 && (
                          <span className="text-xs text-parchment-faint ml-0.5">/{plan.interval}</span>
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
                              ? 'bg-warm hover:bg-warm-light text-white hover:scale-[1.02] active:scale-[0.98]'
                              : 'bg-ink-200 hover:bg-ink-300 text-parchment hover:scale-[1.02] active:scale-[0.98]'
                      } disabled:opacity-60`}
                    >
                      {loading === plan.id
                        ? 'Redirecting...'
                        : isCurrent
                          ? '✓ Current Plan'
                          : isDowngrade
                            ? 'Downgrade not available'
                            : ctaText
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
