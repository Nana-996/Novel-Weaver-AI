// Vercel Serverless Function: /api/verify-payment
// Verifies a Paystack transaction and updates user tier

import { createClient } from '@supabase/supabase-js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

  const user = await verifyUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ error: 'Transaction reference required.' });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment system not configured.' });
  }

  try {
    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    // Extract tier from metadata
    const tier = data.data.metadata?.tier || 'writer';
    const supabase = getSupabaseAdmin();

    if (supabase) {
      // Update user profile tier
      await supabase
        .from('profiles')
        .update({ tier })
        .eq('id', user.id);

      // Upsert subscription record
      const subscriptionData = {
        user_id: user.id,
        tier,
        status: 'active',
        paystack_customer_code: data.data.customer?.customer_code || null,
        paystack_subscription_code: data.data.plan?.subscription_code || null,
        plan_code: data.data.plan?.plan_code || null,
        updated_at: new Date().toISOString(),
      };

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('subscriptions')
          .insert(subscriptionData);
      }
    }

    return res.status(200).json({ success: true, tier });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: `Verification failed: ${error.message}` });
  }
}
