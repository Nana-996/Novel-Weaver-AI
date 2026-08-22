// Vercel Serverless Function: /api/admin/metrics
// Returns high-level metrics, active subscriber counts, revenue summaries, and system statistics

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function verifyAdmin(authHeader) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isRoleAdmin = profile?.role === 'admin' || user.email?.toLowerCase().includes('admin');
  if (!isRoleAdmin) return null;

  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await verifyAdmin(req.headers.authorization);
  if (!admin) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured.' });
  }

  try {
    // 1. Profiles & subscribers
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('tier, role');
    const totalUsers = profiles ? profiles.length : 0;
    const writerSubs = profiles ? profiles.filter(p => p.tier === 'writer').length : 0;
    const novelistSubs = profiles ? profiles.filter(p => p.tier === 'novelist').length : 0;
    const activeSubscribers = writerSubs + novelistSubs;
    const mrr = (writerSubs * 20) + (novelistSubs * 50);

    // 2. Transactions & Revenue
    const { data: transactions } = await supabase.from('transactions').select('amount, type, status, discount_amount');
    let totalGross = 0;
    let topupRev = 0;
    let totalPromoDiscounts = 0;

    if (transactions) {
      transactions.forEach(t => {
        if (t.status === 'success') {
          totalGross += Number(t.amount || 0);
          if (t.type === 'topup') topupRev += Number(t.amount || 0);
          totalPromoDiscounts += Number(t.discount_amount || 0);
        }
      });
    }

    // 3. Today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usageRows } = await supabase.from('usage').select('message_count').eq('date', today);
    const messagesTodayTotal = usageRows ? usageRows.reduce((sum, u) => sum + (u.message_count || 0), 0) : 0;

    // 4. Projects & word counts
    const { data: projects } = await supabase.from('projects').select('word_count');
    const totalProjects = projects ? projects.length : 0;
    const totalWordsWritten = projects ? projects.reduce((sum, p) => sum + (p.word_count || 0), 0) : 0;

    // 5. Promotions
    const { data: promotions } = await supabase.from('promotions').select('is_active, current_uses');
    const activePromos = promotions ? promotions.filter(p => p.is_active).length : 0;
    const totalPromoRedemptions = promotions ? promotions.reduce((sum, p) => sum + (p.current_uses || 0), 0) : 0;

    return res.status(200).json({
      totalUsers,
      activeSubscribers,
      writerSubscribers: writerSubs,
      novelistSubscribers: novelistSubs,
      totalGrossRevenueGHS: totalGross,
      monthlyRecurringRevenueGHS: mrr,
      topupRevenueGHS: topupRev,
      messagesTodayTotal,
      totalProjects,
      totalWordsWritten,
      activePromotionsCount: activePromos,
      totalPromoRedemptions,
      totalPromoDiscountsGivenGHS: totalPromoDiscounts,
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin metrics.' });
  }
}
