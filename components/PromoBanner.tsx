import React, { useState, useEffect } from 'react';
import { getActiveBannerPromotion } from '../services/promotionService';
import type { Promotion } from '../services/promotionService';
import { SparklesIcon, XIcon } from './Icons';

interface PromoBannerProps {
  onOpenPricing?: (promoCode?: string) => void;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ onOpenPricing }) => {
  const [activeBanner, setActiveBanner] = useState<Promotion | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    getActiveBannerPromotion().then(promo => {
      if (promo) {
        // Check if user dismissed this specific promo banner recently
        const dismissedKey = `dismissed_promo_banner_${promo.id}`;
        const dismissedAt = localStorage.getItem(dismissedKey);
        if (!dismissedAt || Date.now() - Number(dismissedAt) > 24 * 3600000) {
          setActiveBanner(promo);
        }
      } else {
        setActiveBanner(null);
      }
    });
  }, []);

  if (!activeBanner || isDismissed || !activeBanner.bannerText) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(`dismissed_promo_banner_${activeBanner.id}`, String(Date.now()));
    } catch (e) {}
  };

  const handleClaim = () => {
    if (onOpenPricing) {
      onOpenPricing(activeBanner.code);
    }
  };

  return (
    <aside 
      aria-label="Special promotion announcement"
      className="relative z-30 bg-gradient-to-r from-warm/90 via-warm to-amber-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs flex items-center justify-between shadow-sm animate-fade-in flex-shrink-0"
    >
      <div className="flex-1 flex items-center justify-center gap-2 truncate pr-2">
        <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0 text-amber-200 animate-pulse-soft" />
        <span className="font-medium truncate text-white/95">
          {activeBanner.bannerText}
        </span>
        <button
          onClick={handleClaim}
          className="ml-2 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] uppercase tracking-wide transition-all hover:scale-105 active:scale-95 flex-shrink-0"
        >
          Claim Now →
        </button>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-black/10 transition-colors flex-shrink-0"
        title="Dismiss announcement"
        aria-label="Dismiss announcement"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};

export default PromoBanner;
