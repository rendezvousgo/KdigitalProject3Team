import { API_BASE_URL } from '../config/api';

function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchPosts({ page = 0, categoryId = null } = {}) {
  const url = buildUrl('/api/board/list', {
    page,
    category: categoryId && categoryId !== 0 ? categoryId : null,
  });
  return request(url);
}

export async function fetchPostDetail(id) {
  const url = buildUrl(`/api/board/detail/${id}`);
  return request(url);
}

export async function createPost({ title, content, writer, categoryId }) {
  const payload = {
    title,
    content,
    writer: writer || '익명',
  };
  if (categoryId) {
    payload.category = { id: Number(categoryId) };
  }

  const url = buildUrl('/api/board/write');
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updatePost(id, { title, content, writer, categoryId }) {
  const payload = {
    title,
    content,
    writer: writer || '익명',
  };
  if (categoryId) {
    payload.category = { id: Number(categoryId) };
  }

  const url = buildUrl(`/api/board/update/${id}`);
  return request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deletePost(id) {
  const url = buildUrl(`/api/board/delete/${id}`);
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.text();
}
