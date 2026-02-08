require('dotenv').config();
const fetch = require('node-fetch');

const BASE = process.env.BACKEND_BASE_URL || 'http://localhost:8080';

async function run() {
  const params = new URLSearchParams({
    ctprvnNm: '서울특별시',
    pageNo: '1',
    numOfRows: '5',
  });

  const url = `${BASE}/api/no-parking-zones?${params.toString()}`;
  console.log('[no-parking] GET', url);

  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text}`);
  }

  const data = JSON.parse(text);
  const count = data?.response?.body?.totalCount;
  console.log('[no-parking] totalCount:', count ?? 'N/A');
}

run().catch((err) => {
  console.error('[no-parking] failed:', err.message);
  process.exit(1);
});
