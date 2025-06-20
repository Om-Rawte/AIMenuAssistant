// supabase.js
// Supabase client and API helpers for customer web app

const SUPABASE_URL = window.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

export function initSupabase() {
  if (!supabase && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export async function fetchMenu() {
  const sb = initSupabase();
  const { data, error } = await sb.from('menu_items').select('*').order('category', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchTable(tableId) {
  const sb = initSupabase();
  const { data, error } = await sb.from('tables').select('*').eq('id', tableId).single();
  if (error) throw error;
  return data;
}

export async function addOrder(order) {
  const sb = initSupabase();
  const { data, error } = await sb.from('orders').insert([order]).select();
  if (error) throw error;
  return data[0];
}

export async function addOrderItems(items) {
  const sb = initSupabase();
  const { data, error } = await sb.from('order_items').insert(items).select();
  if (error) throw error;
  return data;
}

export async function fetchOrderStatus(orderId) {
  const sb = initSupabase();
  const { data, error } = await sb.from('order_items').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data;
}

export async function addFeedback(feedback) {
  const sb = initSupabase();
  const { data, error } = await sb.from('feedback').insert([feedback]).select();
  if (error) throw error;
  return data[0];
}

export function subscribeToOrderItems(orderId, callback) {
  const sb = initSupabase();
  return sb.channel('order_items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, payload => {
      callback(payload);
    })
    .subscribe();
}

export function subscribeToMenu(callback) {
  const sb = initSupabase();
  return sb.channel('menu_items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, payload => {
      callback(payload);
    })
    .subscribe();
}

// --- Group Cart/Consensus Logic ---
// Upsert (insert or update) a user's cart/confirmation for a table
export async function upsertOrderConfirmation(tableId, userId, cart, confirmed) {
  const sb = initSupabase();
  const { data, error } = await sb.from('order_confirmations').upsert([
    {
      table_id: tableId,
      user_id: userId,
      cart: cart,
      confirmed: confirmed,
      updated_at: new Date().toISOString(),
    }
  ], { onConflict: ['table_id', 'user_id'] }).select();
  if (error) throw error;
  return data[0];
}

// Fetch all order confirmations for a table
export async function fetchOrderConfirmations(tableId) {
  const sb = initSupabase();
  const { data, error } = await sb.from('order_confirmations').select('*').eq('table_id', tableId);
  if (error) throw error;
  return data;
}

// Subscribe to real-time changes for a table's order confirmations
export function subscribeToOrderConfirmations(tableId, callback) {
  const sb = initSupabase();
  return sb.channel('order_confirmations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_confirmations', filter: `table_id=eq.${tableId}` }, payload => {
      callback(payload);
    })
    .subscribe();
}

// Clear a user's order confirmation after order placement
export async function clearOrderConfirmation(tableId, userId) {
  const sb = initSupabase();
  const { error } = await sb.from('order_confirmations').delete().eq('table_id', tableId).eq('user_id', userId);
  if (error) throw error;
} 