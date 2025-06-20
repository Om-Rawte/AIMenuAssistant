// utils.js
// Shared utility functions for customer web app

import { initSupabase } from './supabase.js';

// Parse QR code data (expects JSON or key-value string)
export function parseQRData(qrString) {
  try {
    // Try JSON first
    return JSON.parse(qrString);
  } catch {
    // Fallback: key1=val1&key2=val2
    const obj = {};
    qrString.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) obj[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    return obj;
  }
}

// Get query param from URL
export function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Local/session storage helpers
export function saveToStorage(key, value, session = false) {
  (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
}
export function loadFromStorage(key, session = false) {
  const val = (session ? sessionStorage : localStorage).getItem(key);
  try { return JSON.parse(val); } catch { return null; }
}
export function clearStorage(key, session = false) {
  (session ? sessionStorage : localStorage).removeItem(key);
}

// Debounce function
export function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Generate a UUID (v4)
export function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Extract QR/session data from URL
export function getQRSessionData() {
  const params = new URLSearchParams(window.location.search);
  let qr = params.get('qr');
  let data = {};
  if (qr) {
    data = parseQRData(qr);
  } else {
    // Direct params
    ['table_id', 'reservation_id', 'reservation_name', 'geo'].forEach(key => {
      if (params.get(key)) data[key] = params.get(key);
    });
  }
  return data;
}

// Validate reservation name against Supabase
export async function validateReservationName(reservationId, name) {
  const sb = initSupabase();
  const { data, error } = await sb.from('reservations').select('customer_name').eq('id', reservationId).single();
  if (error) throw error;
  return data && data.customer_name && data.customer_name.toLowerCase().trim() === name.toLowerCase().trim();
}

let sessionTimer = null;

// Start a session expiry timer (durationMs: e.g., 3600000 for 1 hour)
export function startSessionTimer(durationMs, onExpire) {
  clearSessionTimer();
  const expiry = Date.now() + durationMs;
  saveToStorage('session_expiry', expiry);
  sessionTimer = setTimeout(() => {
    onExpire();
  }, durationMs);
}

// Clear the session expiry timer
export function clearSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = null;
  clearStorage('session_expiry');
}

// Get session expiry timestamp (or null)
export function getSessionExpiry() {
  return loadFromStorage('session_expiry');
} 