// Thin data-access layer over Supabase. Every call returns plain data or
// throws a friendly Error, so tabs can `try/catch` uniformly.
import { supabase, supabaseConfigured } from './supabase.js';

function guard() {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
}

function wrap(error) {
  if (error) throw new Error(error.message || 'Database request failed.');
}

// ---- leads ----------------------------------------------------------------
export async function listLeads() {
  guard();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  wrap(error);
  return data || [];
}

export async function addLead(lead) {
  guard();
  const { data, error } = await supabase.from('leads').insert(lead).select().single();
  wrap(error);
  return data;
}

export async function updateLead(id, patch) {
  guard();
  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  wrap(error);
  return data;
}

// ---- call_activity --------------------------------------------------------
export async function addCall(call) {
  guard();
  const { data, error } = await supabase.from('call_activity').insert(call).select().single();
  wrap(error);
  return data;
}

export async function listCallsSince(isoDate) {
  guard();
  const { data, error } = await supabase
    .from('call_activity')
    .select('*')
    .gte('call_date', isoDate)
    .order('call_date', { ascending: false });
  wrap(error);
  return data || [];
}

export async function listCallsForLead(leadId) {
  guard();
  const { data, error } = await supabase
    .from('call_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('call_date', { ascending: false });
  wrap(error);
  return data || [];
}

// ---- statement_audits -----------------------------------------------------
export async function addAudit(audit) {
  guard();
  const { data, error } = await supabase
    .from('statement_audits')
    .insert(audit)
    .select()
    .single();
  wrap(error);
  return data;
}

// ---- referral_partners ----------------------------------------------------
export async function listPartners() {
  guard();
  const { data, error } = await supabase
    .from('referral_partners')
    .select('*')
    .order('created_at', { ascending: false });
  wrap(error);
  return data || [];
}

export async function addPartner(partner) {
  guard();
  const { data, error } = await supabase
    .from('referral_partners')
    .insert(partner)
    .select()
    .single();
  wrap(error);
  return data;
}

export async function updatePartner(id, patch) {
  guard();
  const { data, error } = await supabase
    .from('referral_partners')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  wrap(error);
  return data;
}
