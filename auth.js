// auth.js
// Auth/session/email verification/password reset logic for customer web app
import { initSupabase } from './supabase.js';

// Save/load/clear session (localStorage)
export function saveSession(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function loadSession(key) {
  const val = localStorage.getItem(key);
  try { return JSON.parse(val); } catch { return null; }
}
export function clearSession(key) {
  localStorage.removeItem(key);
}

// Handle email verification (for email-verification.html)
export async function handleEmailVerification() {
  const sb = initSupabase();
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const type = params.get('type');
  const messageDiv = document.getElementById('verification-message');
  if (type === 'signup' && accessToken) {
    try {
      // Supabase auto-verifies, just show success
      messageDiv.textContent = 'Your email has been verified! You can now use the menu.';
      messageDiv.className = 'success';
    } catch (e) {
      messageDiv.textContent = 'Verification failed. Please try again or contact support.';
    }
  } else {
    messageDiv.textContent = 'Invalid or expired verification link.';
  }
}

// Handle password reset (for reset-password.html)
export async function handlePasswordReset() {
  const sb = initSupabase();
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const form = document.getElementById('reset-password-form');
  const messageDiv = document.getElementById('reset-message');
  if (!accessToken) {
    messageDiv.textContent = 'Invalid or expired reset link.';
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
      messageDiv.textContent = 'Passwords do not match.';
      return;
    }
    try {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      messageDiv.textContent = 'Password reset successful! You can now return to the menu.';
      messageDiv.className = 'success';
      form.reset();
    } catch (err) {
      messageDiv.textContent = 'Password reset failed. Please try again.';
    }
  });
}

// Auto-run on relevant pages
if (window.location.pathname.endsWith('email-verification.html')) {
  window.addEventListener('DOMContentLoaded', handleEmailVerification);
}
if (window.location.pathname.endsWith('reset-password.html')) {
  window.addEventListener('DOMContentLoaded', handlePasswordReset);
} 