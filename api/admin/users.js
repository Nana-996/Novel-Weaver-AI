// Vercel Serverless Function: /api/admin/users
// Admin endpoint to view users, update tiers, grant bonus credits, or update roles

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await verifyAdmin(req.headers.authorization);
  if (!admin) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured.' });
  }

  try {
    if (req.method === 'GET') {
      // Get auth users + profiles
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: projects } = await supabase.from('projects').select('user_id, word_count');
      const today = new Date().toISOString().split('T')[0];
      const { data: usageRows } = await supabase.from('usage').select('user_id, message_count, bonus_messages').eq('date', today);

      const usersList = (authUsers?.users || []).map(u => {
        const prof = profiles?.find(p => p.id === u.id);
        const userProjects = projects?.filter(p => p.user_id === u.id) || [];
        const userUsage = usageRows?.find(us => us.user_id === u.id);

        return {
          id: u.id,
          email: u.email,
          displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Writer',
          tier: prof?.tier || 'free',
          role: prof?.role || 'user',
          messagesUsedToday: userUsage?.message_count || 0,
          bonusMessages: userUsage?.bonus_messages || 0,
          projectsCount: userProjects.length,
          totalWordCount: userProjects.reduce((s, p) => s + (p.word_count || 0), 0),
          createdAt: u.created_at,
          lastActiveAt: u.last_sign_in_at || u.created_at,
        };
      });

      return res.status(200).json({ users: usersList });
    }

    if (req.method === 'POST') {
      const { action, userId, tier, bonusMessages, role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
      }

      if (action === 'update_tier' && tier) {
        await supabase.from('profiles').update({ tier, updated_at: new Date().toISOString() }).eq('id', userId);
        return res.status(200).json({ success: true, message: `Updated tier to ${tier}` });
      }

      if (action === 'grant_bonus' && bonusMessages) {
        const today = new Date().toISOString().split('T')[0];
        const { data: currentUsage } = await supabase
          .from('usage')
          .select('bonus_messages')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        const currentBonus = currentUsage?.bonus_messages || 0;
        await supabase.from('usage').upsert({
          user_id: userId,
          date: today,
          bonus_messages: currentBonus + Number(bonusMessages),
        }, { onConflict: 'user_id,date' });

        return res.status(200).json({ success: true, message: `Granted ${bonusMessages} bonus messages.` });
      }

      if (action === 'update_role' && role) {
        await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId);
        return res.status(200).json({ success: true, message: `Updated role to ${role}` });
      }

      return res.status(400).json({ error: 'Invalid user management action.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: err.message || 'User action failed.' });
  }
}
