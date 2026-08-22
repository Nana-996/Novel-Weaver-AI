// Vercel Serverless Function: /api/validate-promo
// Validates a promotion code, checks constraints, and returns calculated discount

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code: rawCode, plan, amount } = req.body;
  const originalPrice = Number(amount) || 0;

  if (!rawCode) {
    return res.status(400).json({ valid: false, message: 'Promotion code is required.' });
  }

  const code = String(rawCode).trim().toUpperCase();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Fallback response for simple development validation
    if (code === 'WELCOME50') {
      const discountAmount = originalPrice * 0.5;
      return res.status(200).json({
        valid: true,
        message: '50% welcome discount applied!',
        discountType: 'percentage',
        discountValue: 50,
        originalPrice,
        discountAmount,
        finalPrice: originalPrice - discountAmount,
      });
    }
    return res.status(404).json({ valid: false, message: `Promo code "${code}" not found.` });
  }

  try {
    const { data: promo, error } = await supabase
      .from('promotions')
      .select('*')
      .ilike('code', code)
      .single();

    if (error || !promo) {
      return res.status(404).json({ valid: false, message: `Promo code "${code}" does not exist.` });
    }

    if (!promo.is_active) {
      return res.status(400).json({ valid: false, message: `Promo code "${code}" is no longer active.` });
    }

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return res.status(400).json({ valid: false, message: `Promo code "${code}" is not yet active.` });
    }

    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return res.status(400).json({ valid: false, message: `Promo code "${code}" has expired.` });
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return res.status(400).json({ valid: false, message: `Promo code "${code}" has reached maximum usage limit.` });
    }

    if (promo.applies_to !== 'all' && promo.applies_to !== plan) {
      return res.status(400).json({
        valid: false,
        message: `Promo code "${code}" is only valid for the ${promo.applies_to} plan.`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let finalPrice = originalPrice;
    let isFreeGrant = false;

    if (promo.discount_type === 'percentage') {
      discountAmount = (originalPrice * Number(promo.discount_value)) / 100;
      finalPrice = Math.max(0, originalPrice - discountAmount);
    } else if (promo.discount_type === 'fixed_amount') {
      discountAmount = Math.min(originalPrice, Number(promo.discount_value));
      finalPrice = Math.max(0, originalPrice - discountAmount);
    } else if (promo.discount_type === 'free_bonus_messages' || promo.discount_type === 'free_tier_days') {
      discountAmount = originalPrice;
      finalPrice = 0;
      isFreeGrant = true;
    }

    return res.status(200).json({
      valid: true,
      message: `Promo code "${promo.code}" applied!`,
      promotion: {
        id: promo.id,
        code: promo.code,
        title: promo.title,
        description: promo.description,
        discountType: promo.discount_type,
        discountValue: Number(promo.discount_value),
        appliesTo: promo.applies_to,
      },
      discountType: promo.discount_type,
      discountValue: Number(promo.discount_value),
      originalPrice,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      isFreeGrant,
    });
  } catch (err) {
    console.error('Validate promo error:', err);
    return res.status(500).json({ valid: false, message: 'Server error while validating promo.' });
  }
}
