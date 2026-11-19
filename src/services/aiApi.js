import { getAccessToken } from './supabase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  if (!API_BASE_URL) throw new Error('Thiếu cấu hình VITE_API_BASE_URL.');
  const token = authenticated ? await getAccessToken() : null;
  if (authenticated && !token) throw new Error('Không tìm thấy phiên đăng nhập MOVA.');

  const response = await fetch(`${API_BASE_URL}/api/v2${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
  }
  if (payload?.status !== 'success') throw new Error('Backend trả về dữ liệu không hợp lệ.');
  return payload.data;
}

export function updateAiProfile(profile) {
  return request('/account/profile', { method: 'PUT', body: profile });
}

export function updateAiConsents(consents) {
  return request('/account/consents', { method: 'PUT', body: consents });
}

export function getAiConsents() {
  return request('/account/consents');
}

export function generateMealPlan(input) {
  return request('/ai/generate-meal-plan', { method: 'POST', body: input });
}

export function generateGuestMealPlan(input) {
  return request('/ai/guest/generate-meal-plan', {
    method: 'POST',
    body: { ...input, personal_data_consent: true },
    authenticated: false
  });
}

export function getPersonalizedRecommendations() {
  return request('/recommendations/personalized');
}

export function trackAiEvents(events) {
  return request('/tracking/events', { method: 'POST', body: { events } });
}
