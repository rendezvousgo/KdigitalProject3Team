require('dotenv').config();
const fetch = require('node-fetch');

const BASE = process.env.BACKEND_BASE_URL || 'http://localhost:8080';

async function run() {
  const params = new URLSearchParams({
    lat: '37.5665',
    lng: '126.9780',
    radiusKm: '1',
    region: '서울특별시',
  });

  const url = `${BASE}/api/parking-lots/nearby?${params.toString()}`;
  console.log('[parking] GET', url);

  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text}`);
  }

  const data = JSON.parse(text);
  console.log('[parking] count:', Array.isArray(data) ? data.length : 0);
  if (Array.isArray(data) && data.length > 0) {
    console.log('[parking] first:', data[0].name, data[0].distance);
  }
}

run().catch((err) => {
  console.error('[parking] failed:', err.message);
  process.exit(1);
});
