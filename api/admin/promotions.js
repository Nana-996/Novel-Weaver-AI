// Vercel Serverless Function: /api/admin/promotions
// Admin endpoint for managing promotions, discounts, and banner announcements

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ promotions: data || [] });
    }

    if (req.method === 'POST') {
      const {
        code,
        title,
        description,
        discount_type,
        discount_value,
        applies_to,
        max_uses,
        valid_from,
        valid_until,
        is_active,
        banner_active,
        banner_text,
      } = req.body;

      if (!code || !title || discount_value === undefined) {
        return res.status(400).json({ error: 'Code, title, and discount value are required.' });
      }

      // If activating banner, turn off other banners
      if (banner_active) {
        await supabase.from('promotions').update({ banner_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase.from('promotions').insert({
        code: String(code).trim().toUpperCase(),
        title,
        description,
        discount_type: discount_type || 'percentage',
        discount_value: Number(discount_value),
        applies_to: applies_to || 'all',
        max_uses: max_uses ? Number(max_uses) : null,
        current_uses: 0,
        valid_from: valid_from || new Date().toISOString(),
        valid_until: valid_until || null,
        is_active: is_active !== false,
        banner_active: Boolean(banner_active),
        banner_text: banner_text || null,
      }).select().single();

      if (error) throw error;
      return res.status(201).json({ promotion: data });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'Promotion ID is required.' });

      if (updates.banner_active) {
        await supabase.from('promotions').update({ banner_active: false }).neq('id', id);
      }

      const { data, error } = await supabase
        .from('promotions')
        .update({
          ...updates,
          ...(updates.code ? { code: updates.code.trim().toUpperCase() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ promotion: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Promotion ID is required.' });

      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin promotion error:', err);
    return res.status(500).json({ error: err.message || 'Promotion operation failed.' });
  }
}
