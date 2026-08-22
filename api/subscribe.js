// Vercel Serverless Function: /api/subscribe
// Initializes a Paystack transaction for subscription

import { createClient } from '@supabase/supabase-js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Plan codes — create these in your Paystack Dashboard
// Amount is in pesewas (GHS * 100)
const PLANS = {
  topup: {
    name: 'Bonus Messages (Top-Up)',
    amount: 1000, // GHS 10.00
    interval: 'one-time',
    plan_code: '', // Top-ups are usually one-off payments without plan codes
  },
  writer: {
    name: 'Writer',
    amount: 2000, // GHS 20.00
    interval: 'monthly',
    plan_code: process.env.PAYSTACK_WRITER_PLAN_CODE || '',
  },
  novelist: {
    name: 'Novelist',
    amount: 5000, // GHS 50.00
    interval: 'monthly',
    plan_code: process.env.PAYSTACK_NOVELIST_PLAN_CODE || '',
  },
};

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function verifyUser(authHeader) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Authenticate
  const user = await verifyUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { tier, promo_code } = req.body;
  const plan = PLANS[tier];

  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan. Choose "writer", "novelist", or "topup".' });
  }

  const supabase = getSupabaseAdmin();
  let finalAmountInPesewas = plan.amount;
  let appliedPromo = null;
  let discountAmountInGHS = 0;

  // Validate promo code if supplied
  if (promo_code) {
    const cleanCode = String(promo_code).trim().toUpperCase();
    if (supabase) {
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .single();

      if (promoData) {
        appliedPromo = promoData;
        const originalGHS = plan.amount / 100;
        
        if (promoData.discount_type === 'percentage') {
          discountAmountInGHS = (originalGHS * Number(promoData.discount_value)) / 100;
        } else if (promoData.discount_type === 'fixed_amount') {
          discountAmountInGHS = Math.min(originalGHS, Number(promoData.discount_value));
        } else if (promoData.discount_type === 'free_bonus_messages' || promoData.discount_type === 'free_tier_days') {
          discountAmountInGHS = originalGHS;
        }

        finalAmountInPesewas = Math.max(0, Math.round((originalGHS - discountAmountInGHS) * 100));
      }
    }
  }

  // If 100% discount or free grant code
  if (finalAmountInPesewas === 0 && appliedPromo) {
    if (supabase) {
      if (appliedPromo.discount_type === 'free_bonus_messages') {
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('usage')
          .select('bonus_messages')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        const curBonus = usageData?.bonus_messages || 0;
        await supabase.from('usage').upsert({
          user_id: user.id,
          date: today,
          bonus_messages: curBonus + Number(appliedPromo.discount_value || 50),
        }, { onConflict: 'user_id,date' });
      } else {
        await supabase.from('profiles').update({ tier }).eq('id', user.id);
      }

      // Record redemption
      await supabase.from('promotion_redemptions').insert({
        promo_id: appliedPromo.id,
        promo_code: appliedPromo.code,
        user_id: user.id,
        user_email: user.email,
        plan: tier,
        original_amount: plan.amount / 100,
        discount_amount: plan.amount / 100,
        final_amount: 0,
      });

      // Increment promo usage
      await supabase.from('promotions').update({
        current_uses: (appliedPromo.current_uses || 0) + 1,
      }).eq('id', appliedPromo.id);
    }

    return res.status(200).json({
      success: true,
      freeGrant: true,
      tier,
      message: 'Promotion redeemed successfully! Your account has been upgraded.',
    });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment system not configured.' });
  }

  try {
    // Initialize a Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: finalAmountInPesewas,
        currency: 'GHS',
        plan: finalAmountInPesewas === plan.amount ? (plan.plan_code || undefined) : undefined,
        callback_url: `${req.headers.origin || 'https://novel-weaver.app'}/payment-callback`,
        metadata: {
          user_id: user.id,
          tier: tier,
          type: tier === 'topup' ? 'topup' : 'subscription',
          promo_code: appliedPromo ? appliedPromo.code : null,
          promo_id: appliedPromo ? appliedPromo.id : null,
          discount_amount_ghs: discountAmountInGHS,
          original_amount_ghs: plan.amount / 100,
          custom_fields: [
            { display_name: 'Purchase Type', variable_name: 'type', value: plan.name },
            { display_name: 'User ID', variable_name: 'user_id', value: user.id },
            { display_name: 'Promo Code', variable_name: 'promo_code', value: appliedPromo?.code || 'None' },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Payment initialization failed' });
    }

    return res.status(200).json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: `Payment error: ${error.message}` });
  }
}
