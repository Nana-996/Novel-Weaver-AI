// Vercel Serverless Function: /api/paystack-webhook
// Handles Paystack webhook events for subscription lifecycle

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Map Paystack plan amounts (in pesewas) to tiers
function getTierFromAmount(amount) {
  if (amount >= 5000) return 'novelist'; // GHS 50
  if (amount >= 2500) return 'writer';   // GHS 25
  return 'free';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const signature = req.headers['x-paystack-signature'];
  if (!signature || !PAYSTACK_SECRET_KEY) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    console.error('Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error('Supabase not configured for webhook');
    return res.status(200).json({ received: true }); // Acknowledge anyway
  }

  console.log(`Webhook received: ${event.event}`);

  try {
    switch (event.event) {
      case 'charge.success': {
        // Successful payment — check if it has a plan (subscription)
        const data = event.data;
        const userId = data.metadata?.user_id;
        const tier = data.metadata?.tier || getTierFromAmount(data.amount);

        if (userId) {
          await supabase
            .from('profiles')
            .update({ tier })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription.create': {
        const data = event.data;
        const customerEmail = data.customer?.email;

        if (customerEmail) {
          // Find user by email
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === customerEmail);

          if (user) {
            const tier = getTierFromAmount(data.plan?.amount || 0);

            await supabase
              .from('subscriptions')
              .upsert({
                user_id: user.id,
                paystack_subscription_code: data.subscription_code,
                paystack_customer_code: data.customer?.customer_code,
                plan_code: data.plan?.plan_code,
                tier,
                status: 'active',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });

            await supabase
              .from('profiles')
              .update({ tier })
              .eq('id', user.id);
          }
        }
        break;
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const data = event.data;
        const subscriptionCode = data.subscription_code;

        if (subscriptionCode) {
          // Find subscription and downgrade user
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('paystack_subscription_code', subscriptionCode)
            .single();

          if (sub) {
            const status = event.event === 'subscription.disable' ? 'cancelled' : 'non_renewing';

            await supabase
              .from('subscriptions')
              .update({ status, updated_at: new Date().toISOString() })
              .eq('paystack_subscription_code', subscriptionCode);

            // Downgrade to free
            if (event.event === 'subscription.disable') {
              await supabase
                .from('profiles')
                .update({ tier: 'free' })
                .eq('id', sub.user_id);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const data = event.data;
        const subscriptionCode = data.subscription?.subscription_code;

        if (subscriptionCode) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('paystack_subscription_code', subscriptionCode);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Paystack from retrying
  }

  return res.status(200).json({ received: true });
}
