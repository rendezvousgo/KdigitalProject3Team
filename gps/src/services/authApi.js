import { API_BASE_URL } from '../config/api';

async function authRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  // logout returns empty
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return null;
}

export async function login(username, password) {
  return authRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register({ username, password, nickname, email }) {
  return authRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, nickname, email }),
  });
}

export async function logout() {
  return authRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMe() {
  return authRequest('/api/auth/me', {
    method: 'GET',
  });
}

export async function fetchCategories() {
  const url = `${API_BASE_URL}/api/categories`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('카테고리 불러오기 실패');
  return res.json();
}

export async function createCategory(name) {
  const url = `${API_BASE_URL}/api/categories`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '카테고리 생성 실패');
  }
  return res.json();
}

export async function deleteCategory(id) {
  const url = `${API_BASE_URL}/api/categories/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '카테고리 삭제 실패');
  }
  return res.text();
}
