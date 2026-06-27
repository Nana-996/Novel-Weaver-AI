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

  const { tier } = req.body;
  const plan = PLANS[tier];

  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan. Choose "writer" or "novelist".' });
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
        amount: plan.amount,
        currency: 'GHS',
        plan: plan.plan_code || undefined,
        callback_url: `${req.headers.origin || 'https://novel-weaver.app'}/payment-callback`,
        metadata: {
          user_id: user.id,
          tier: tier,
          type: tier === 'topup' ? 'topup' : 'subscription',
          custom_fields: [
            { display_name: 'Purchase Type', variable_name: 'type', value: plan.name },
            { display_name: 'User ID', variable_name: 'user_id', value: user.id },
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
