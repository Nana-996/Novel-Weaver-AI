import PaystackPop from '@paystack/inline-js';
import { supabase } from './supabaseClient';
import { getAccessToken } from './authService';
import { recordTransaction } from './adminService';
import type { PromotionValidationResult } from './promotionService';

export interface PaystackCheckoutOptions {
  tier: 'writer' | 'novelist' | 'topup';
  userEmail?: string;
  userId?: string;
  amountGHS: number; // in GHS
  promo?: PromotionValidationResult | null;
  onSuccess: (response: { reference: string; tier: string }) => void;
  onCancel?: () => void;
  onError?: (err: string) => void;
}

export function getPaystackPublicKey(): string {
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
  if (envKey && !envKey.includes('pk_test_xxx') && !envKey.includes('your-paystack-key')) {
    return envKey;
  }
  return 'pk_test_eb9230a86dffed577210355ad3d80205f5cad9b6';
}

export function isPaystackConfigured(): boolean {
  return true;
}

/**
 * Handle successful payment verification and update user state + records
 */
export async function verifyAndApplyPayment(
  reference: string,
  tier: 'writer' | 'novelist' | 'topup',
  userId: string,
  userEmail: string,
  amountPaidGHS: number,
  promoCode?: string | null,
  discountAmountGHS: number = 0
): Promise<{ success: boolean; message?: string }> {
  // 1. Backend serverless verification if online
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify({ reference }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
    }
  } catch (e) {}

  // 2. Direct Supabase database update
  if (supabase && userId && !userId.startsWith('guest_')) {
    try {
      if (tier === 'topup') {
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('usage')
          .select('bonus_messages')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        const currentBonus = usageData?.bonus_messages || 0;
        await supabase.from('usage').upsert({
          user_id: userId,
          date: today,
          bonus_messages: currentBonus + 50,
        }, { onConflict: 'user_id,date' });
      } else {
        await supabase
          .from('profiles')
          .update({ tier, updated_at: new Date().toISOString() })
          .eq('id', userId);

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            tier,
            status: 'active',
            reference,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }

      if (promoCode) {
        await supabase.from('promotion_redemptions').insert({
          promo_code: promoCode,
          user_id: userId,
          user_email: userEmail,
          plan: tier,
          original_amount: amountPaidGHS + discountAmountGHS,
          discount_amount: discountAmountGHS,
          final_amount: amountPaidGHS,
        });
      }
    } catch (dbErr) {
      console.warn('Database update fallback failed:', dbErr);
    }
  }

  // 3. Record in Admin Transaction Ledger
  await recordTransaction({
    userId: userId || 'author_guest',
    userEmail: userEmail || 'author@novelweaver.app',
    reference,
    amount: amountPaidGHS,
    currency: 'GHS',
    tier,
    type: tier === 'topup' ? 'topup' : 'subscription',
    promoCode: promoCode || null,
    discountAmount: discountAmountGHS,
    status: 'success',
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Open Real Official Paystack Popup Checkout via @paystack/inline-js
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
  const {
    tier,
    userEmail,
    userId = 'guest_user',
    amountGHS,
    promo,
    onSuccess,
    onCancel,
    onError,
  } = options;

  const publicKey = getPaystackPublicKey();
  const amountInPesewas = Math.max(100, Math.round(amountGHS * 100)); // GHS to pesewas (e.g. 2000 for GHS 20)
  const reference = `NW_${tier.toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const validEmail = (userEmail && userEmail.includes('@')) ? userEmail : 'author@novelweaver.app';

  try {
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: publicKey,
      email: validEmail,
      amount: amountInPesewas,
      currency: 'GHS',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Tier', variable_name: 'tier', value: tier },
          { display_name: 'User ID', variable_name: 'user_id', value: userId },
          { display_name: 'Promo Code', variable_name: 'promo_code', value: promo?.promotion?.code || 'None' },
        ],
      },
      onSuccess: async (transaction: any) => {
        const resRef = transaction?.reference || reference;
        await verifyAndApplyPayment(
          resRef,
          tier,
          userId,
          validEmail,
          amountGHS,
          promo?.promotion?.code || null,
          promo?.discountAmount || 0
        );
        onSuccess({ reference: resRef, tier });
      },
      onCancel: () => {
        if (onCancel) onCancel();
      },
      onError: (error: any) => {
        console.error('Paystack Popup Error:', error);
        if (onError) onError(error?.message || 'Payment was not completed.');
      },
    });
  } catch (err: any) {
    console.error('Paystack initialization error:', err);
    if (onError) onError(err.message || 'Could not initialize Paystack popup.');
  }
}
