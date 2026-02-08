require('dotenv').config();
const fetch = require('node-fetch');

const BASE = process.env.BACKEND_BASE_URL || 'http://localhost:8080';

async function run() {
  const params = new URLSearchParams({
    originLat: '37.5665',
    originLng: '126.9780',
    destinationLat: '37.565308',
    destinationLng: '126.980109',
    priority: 'RECOMMEND',
  });

  const url = `${BASE}/api/directions?${params.toString()}`;
  console.log('[directions] GET', url);

  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text}`);
  }

  const data = JSON.parse(text);
  console.log('[directions] distance:', data.distance, 'duration:', data.duration);
}

run().catch((err) => {
  console.error('[directions] failed:', err.message);
  process.exit(1);
});
