import { supabase } from './supabaseClient';
import { getAccessToken } from './authService';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_bonus_messages' | 'free_tier_days';

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 50 (50%), 10 (GHS 10), 100 (100 messages), 14 (14 days)
  appliesTo: 'all' | 'writer' | 'novelist' | 'topup';
  maxUses: number | null;
  currentUses: number;
  validFrom: string;
  validUntil?: string | null;
  isActive: boolean;
  bannerActive: boolean;
  bannerText?: string;
  createdAt: string;
}

export interface PromotionValidationResult {
  valid: boolean;
  message?: string;
  promotion?: Promotion;
  discountType?: DiscountType;
  discountValue?: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  isFreeGrant?: boolean;
}

// Local storage key for persisting promotions
const LOCAL_PROMOS_KEY = 'novel_weaver_promotions_v1';

export function getStoredLocalPromotions(): Promotion[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROMOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local promotions', e);
  }
  return [];
}

export function saveStoredLocalPromotions(promos: Promotion[]): void {
  try {
    localStorage.setItem(LOCAL_PROMOS_KEY, JSON.stringify(promos));
  } catch (e) {
    console.error('Failed to save local promotions', e);
  }
}

// Fetch all active promotions
export async function getActivePromotions(): Promise<Promotion[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          title: d.title,
          description: d.description,
          discountType: d.discount_type as DiscountType,
          discountValue: Number(d.discount_value),
          appliesTo: d.applies_to,
          maxUses: d.max_uses,
          currentUses: d.current_uses || 0,
          validFrom: d.valid_from,
          validUntil: d.valid_until,
          isActive: d.is_active,
          bannerActive: d.banner_active,
          bannerText: d.banner_text,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn('[promotionService] Error querying Supabase promotions, using local fallback:', err);
    }
  }

  return getStoredLocalPromotions().filter(p => p.isActive);
}

// Get the active banner promotion for app-wide announcement
export async function getActiveBannerPromotion(): Promise<Promotion | null> {
  const active = await getActivePromotions();
  return active.find(p => p.bannerActive && p.bannerText) || null;
}

// Calculate discount amount from price and promotion
export function calculateDiscount(
  promo: Promotion,
  originalPrice: number,
  planId: string
): { discountAmount: number; finalPrice: number; isFreeGrant: boolean } {
  // Check applicability
  if (promo.appliesTo !== 'all' && promo.appliesTo !== planId) {
    return { discountAmount: 0, finalPrice: originalPrice, isFreeGrant: false };
  }

  if (promo.discountType === 'percentage') {
    const discount = Math.min(originalPrice, (originalPrice * promo.discountValue) / 100);
    const finalPrice = Math.max(0, originalPrice - discount);
    return {
      discountAmount: Math.round(discount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      isFreeGrant: finalPrice === 0,
    };
  }

  if (promo.discountType === 'fixed_amount') {
    const discount = Math.min(originalPrice, promo.discountValue);
    const finalPrice = Math.max(0, originalPrice - discount);
    return {
      discountAmount: Math.round(discount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      isFreeGrant: finalPrice === 0,
    };
  }

  if (promo.discountType === 'free_bonus_messages' || promo.discountType === 'free_tier_days') {
    return {
      discountAmount: originalPrice,
      finalPrice: 0,
      isFreeGrant: true,
    };
  }

  return { discountAmount: 0, finalPrice: originalPrice, isFreeGrant: false };
}

// Validate a promotional code for a specific plan and user
export async function validatePromoCode(
  rawCode: string,
  planId: string,
  originalPriceGHS: number
): Promise<PromotionValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      message: 'Please enter a promotion code.',
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  // Try API validation first
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/validate-promo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, plan: planId, amount: originalPriceGHS }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // API endpoint might not be reached in local preview without vercel dev, use client validation
  }

  // Client / Local fallback validation
  const promos = await getActivePromotions();
  const match = promos.find(p => p.code.toUpperCase() === code);

  if (!match) {
    return {
      valid: false,
      message: `Promo code "${code}" is invalid or expired.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  if (!match.isActive) {
    return {
      valid: false,
      message: `Promo code "${code}" is no longer active.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  // Check validity dates
  const now = new Date();
  if (match.validFrom && new Date(match.validFrom) > now) {
    return {
      valid: false,
      message: `Promo code "${code}" is not yet active.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  if (match.validUntil && new Date(match.validUntil) < now) {
    return {
      valid: false,
      message: `Promo code "${code}" has expired.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  // Check usage limits
  if (match.maxUses !== null && match.currentUses >= match.maxUses) {
    return {
      valid: false,
      message: `Promo code "${code}" has reached its maximum redemptions limit.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  // Check plan applicability
  if (match.appliesTo !== 'all' && match.appliesTo !== planId) {
    return {
      valid: false,
      message: `Promo code "${code}" is only applicable for the ${match.appliesTo.toUpperCase()} plan.`,
      originalPrice: originalPriceGHS,
      discountAmount: 0,
      finalPrice: originalPriceGHS,
    };
  }

  const { discountAmount, finalPrice, isFreeGrant } = calculateDiscount(match, originalPriceGHS, planId);

  return {
    valid: true,
    message: `Promotion "${match.title}" applied successfully!`,
    promotion: match,
    discountType: match.discountType,
    discountValue: match.discountValue,
    originalPrice: originalPriceGHS,
    discountAmount,
    finalPrice,
    isFreeGrant,
  };
}
