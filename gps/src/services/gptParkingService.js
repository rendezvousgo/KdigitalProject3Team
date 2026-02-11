/**
 * SafeParking 네비 AI 서비스
 *
 * 흐름:
 *   1. GPT-4.1 Nano  →  사용자 발화를 구조화된 "요청 테이블(JSON)"로 분류
 *   2. 코드 검증      →  테이블 필드 유효성 · 논리 충돌 · 맥락 보정
 *   3. 실제 데이터     →  공영주차장 / 카카오 API / 경로 API 조회
 *   4. GPT-4.1 Mini  →  테이블 + 조회 결과 → 네비 AI 톤 답변 생성
 *   5. 롤백 / 선택    →  "아니야" → 이전 복원 | "1번" → 결과 선택
 */

import { findNearbyParkingLots, searchPlaces, getDirections, formatDistance, formatDuration } from './api';

// ── GPT API 설정 ──────────────────────────────────────────
const GPT_API_KEY =
  'YOUR_OPENAI_API_KEY_HERE';

const MODEL_CLASSIFY = 'gpt-4.1-nano';
const MODEL_ANSWER   = 'gpt-4.1-mini';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// ── 요청 테이블 스키마 (확장) ─────────────────────────────
//
// [ 기본 필드 ]
//   intent          : 요청 의도 (아래 VALID_INTENTS 참고)
//   region          : 목적지/검색 지역명. null이면 현재 위치 기준
//   destination     : 경로 안내 목적지명 (건물, 주차장 등)
//   departure       : 출발지명. null이면 현재 위치
//
// [ 주차장 필터 ]
//   parking_type    : "public" | "private" | "any"
//   fee_type        : "free" | "paid" | "any"
//   max_fee         : 최대 요금(원). null이면 제한 없음
//   max_distance_km : 검색 반경 0.5~50 (기본 5)
//   duration_min    : 예상 주차 시간(분). null이면 미지정
//   sort_by         : "distance" | "price" | "capacity"
//   top_n           : 결과 개수 1~10 (기본 3)
//
// [ 경로/네비 ]
//   route_pref      : "fastest" | "shortest" | "free" | null
//   time_constraint : 시간 제약 문자열 ("오후 3시까지" 등). null이면 없음
//
// [ 선택/상호작용 ]
//   select_index    : 이전 결과 목록에서 N번 선택 (1-based). null이면 선택 안 함
//   keywords        : 추가 키워드 배열 (["넓은","24시간","지하"] 등)
//   rollback        : "O" | "X"
// ──────────────────────────────────────────────────────────

const TABLE_SCHEMA_DESCRIPTION = `{
  "intent": "find_parking | recommend_parking | parking_detail | route_set | select_result | nearby_search | traffic_info | cancel | rollback | greeting | general",
  "region": "string | null",
  "destination": "string | null",
  "departure": "string | null",
  "parking_type": "public | private | any",
  "fee_type": "free | paid | any",
  "max_fee": "number | null  (단위: 원)",
  "max_distance_km": "number (0.5~50, default 5)",
  "duration_min": "number | null",
  "sort_by": "distance | price | capacity",
  "top_n": "number (1~10, default 3)",
  "route_pref": "fastest | shortest | free | null",
  "time_constraint": "string | null",
  "select_index": "number (1-based) | null",
  "keywords": "[string]",
  "rollback": "O | X"
}`;

// ── 분류 프롬프트 ─────────────────────────────────────────
const CLASSIFY_SYSTEM_PROMPT = `너는 차량용 내비게이션 AI 시스템의 요청 분류 엔진이다.
운전자의 자연어 음성/텍스트 명령을 분석하여, 아래 JSON 스키마 하나만 정확히 출력하라.
JSON 이외의 텍스트는 절대 포함하지 마라.

스키마:
${TABLE_SCHEMA_DESCRIPTION}

═══ intent 분류 기준 ═══

find_parking — 주차장 검색/찾기
  "근처 주차장", "시청 부근 주차장 찾아줘", "공영 주차장 어디 있어"

recommend_parking — 조건 기반 추천
  "추천해줘", "좋은 데 없어?", "싸고 가까운 데", "여기서 제일 넓은 주차장"

parking_detail — 특정 주차장 상세 정보
  "거기 요금 얼마야", "몇 시까지 해?", "자리 남아있어?"

route_set — 특정 장소 또는 이전 결과로 경로 안내 요청
  "거기로 안내해줘", "경로 설정해줘", "그쪽으로 가자", "길 알려줘", "1번으로 가줘"
  ※ "거기", "그쪽", "N번" 등 이전 결과를 가리키면 select_index에 번호를 넣어라
  ※ 구체적 장소명이면 destination에 넣어라

select_result — 이전 추천 목록에서 선택 (경로 없이 단순 선택)
  "1번", "두 번째 거", "그거로 할게", "마지막 거"
  ※ select_index에 번호

nearby_search — 주차장이 아닌 주변 시설 검색
  "근처 편의점", "주변 화장실", "가까운 주유소"

traffic_info — 교통/도로 상황 문의
  "지금 길 막혀?", "정체 심해?", "빠른 길로 가줘"

cancel — 현재 작업 취소
  "취소", "됐어", "그만"

rollback — 이전 상태로 되돌리기
  "아니야", "다른 거", "그거 말고", "다시 찾아줘", "마음에 안 들어"
  ※ rollback="O"으로 설정

greeting — 인사/안부
  "안녕", "고마워", "수고해"

general — 위에 해당 안 되는 일반 대화

═══ 필드 매핑 규칙 ═══

1. 지역명("시청","강남역","홍대입구","부산") → region
2. 구체적 목적지("○○주차장","○○빌딩") → destination
3. "무료" → fee_type="free" / "공영" → parking_type="public" / "민영","사설" → parking_type="private"
4. "N만원 이하", "5천원 이내" → max_fee (원 단위 숫자)
5. "가까운 순" → sort_by="distance" / "싼 순","저렴한" → sort_by="price" / "넓은","많은" → sort_by="capacity"
6. "N개","N곳" → top_n / "많이 보여줘" → top_n=5~10
7. "빨리","빠른 길" → route_pref="fastest" / "고속도로 안 타고" → route_pref="free"
8. "30분","1시간" (주차 시간 맥락) → duration_min
9. "N시까지","오후까지" → time_constraint
10. "넓은","24시간","지하","옥외" 등 조건 키워드 → keywords 배열
11. "N번으로","N번째" → select_index
12. 부정적 반응("싫어","별로","다시") → rollback="O"
13. 이전에 주차장 목록을 보여줬는데 "거기","그쪽" → 가장 최근 1번 결과 = select_index=1

※ 이전 대화 맥락이 주어지면 반드시 참고하여 "그쪽","거기","그거" 등 지시어를 해석하라.
※ 맥락 없이 모호하면 find_parking으로 분류하라.`;

// ── 답변 프롬프트 ─────────────────────────────────────────
const ANSWER_SYSTEM_PROMPT = `너는 SafeParking 차량 내비게이션 AI 안내 시스템이다.
이름은 "SafeParking AI"이고, 운전 중인 사용자에게 음성으로 읽힐 수 있는 간결하고 명확한 안내를 제공한다.

═══ 말투 규칙 ═══
- 존댓말 사용, 하지만 네비게이션처럼 간결하게
- "~입니다", "~드리겠습니다", "~하세요" 체
- 불필요한 수식어, 이모지 사용 금지
- 한 문장은 최대 30자 이내 권장
- 핵심 정보를 먼저, 부가 정보는 뒤에

═══ 상황별 답변 형식 ═══

[주차장 검색/추천 결과가 있을 때]
"주변 주차장 N곳을 안내드리겠습니다."
→ 각 주차장: 이름, 거리, 요금 핵심만
→ "경로 안내를 원하시면 번호로 말씀해주세요."

[주차장 결과가 없을 때]
"현재 조건에 맞는 주차장을 찾지 못했습니다. 검색 범위를 넓혀볼까요?"

[경로 안내 (route_set)]
"○○까지 경로를 안내합니다. 예상 소요 시간 N분, 거리 N.Nkm입니다."

[결과 선택 (select_result)]
"N번 ○○ 주차장을 선택하셨습니다. 경로 안내를 시작할까요?"

[롤백]
"이전 안내를 취소합니다. 다시 검색하시겠습니까?"

[인사]
간단히 응대. "안녕하세요. SafeParking AI입니다. 목적지를 말씀해주세요."

[일반 대화]
주차·경로·교통 관련 도움을 줄 수 있다고 짧게 안내.

[교통 정보]
현재는 실시간 교통 데이터 미지원임을 안내하고, 경로 안내는 가능하다고 알려줘.

═══ 금지 사항 ═══
- ChatGPT나 AI 어시스턴트처럼 장황하게 답변하지 마라
- "제가 도와드릴게요~", "물론이죠!" 같은 과잉 친절 표현 금지
- 이모지 사용 금지
- "파킹이" 같은 캐릭터 연기 금지
- 데이터에 없는 정보를 추측하거나 지어내지 마라`;

// ── 대화 히스토리 (롤백 + 결과 참조 지원) ─────────────────
let _tableHistory = [];     // 과거 테이블 스택
let _lastTable = null;      // 가장 최근 테이블
let _lastParkingList = [];  // 가장 최근 주차장 결과 (select_result/route_set 참조용)
let _lastRouteInfo = null;  // 마지막 경로 정보

export function getLastTable() {
  return _lastTable;
}

export function getLastParkingList() {
  return _lastParkingList;
}

export function getLastRouteInfo() {
  return _lastRouteInfo;
}

export function resetConversation() {
  _tableHistory = [];
  _lastTable = null;
  _lastParkingList = [];
  _lastRouteInfo = null;
}

// ── OpenAI API 호출 ──────────────────────────────────────
async function callGPT(model, systemPrompt, userContent, temperature = 0.3) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature,
    max_tokens: 1024,
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GPT_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.log('GPT API error:', res.status, errText);
    throw new Error(`GPT API 오류 (${res.status})`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── 1) 분류: 사용자 발화 → 테이블 JSON ──────────────────
async function classifyRequest(userText, conversationContext = '') {
  // 이전 결과 목록 요약을 맥락에 포함 (지시어 해석용)
  let contextWithResults = conversationContext;
  if (_lastParkingList.length > 0) {
    const listSummary = _lastParkingList
      .map((p, i) => `${i + 1}번: ${p.name}`)
      .join(', ');
    contextWithResults += `\n[이전 추천 주차장 목록: ${listSummary}]`;
  }

  const prompt = contextWithResults
    ? `이전 대화 맥락:\n${contextWithResults}\n\n사용자 발화: "${userText}"`
    : `사용자 발화: "${userText}"`;

  const raw = await callGPT(MODEL_CLASSIFY, CLASSIFY_SYSTEM_PROMPT, prompt, 0.1);

  // JSON 추출 (코드블록 감싸기 대응)
  let jsonStr = raw;
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) jsonStr = m[1].trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log('GPT classify parse fail:', raw);
    return getDefaultTable();
  }
}

// ── 2) 테이블 검증 ──────────────────────────────────────
const VALID_INTENTS = [
  'find_parking', 'recommend_parking', 'parking_detail',
  'route_set', 'select_result', 'nearby_search', 'traffic_info',
  'cancel', 'rollback', 'greeting', 'general',
];
const VALID_PARKING_TYPES = ['public', 'private', 'any'];
const VALID_FEE_TYPES = ['free', 'paid', 'any'];
const VALID_SORT = ['distance', 'price', 'capacity'];
const VALID_ROUTE_PREF = ['fastest', 'shortest', 'free', null];

function validateTable(table) {
  const errors = [];

  if (!table || typeof table !== 'object') {
    return { valid: false, errors: ['테이블이 객체가 아닙니다'], fixed: getDefaultTable() };
  }

  const fixed = { ...table };

  // ── 필드별 검증 & 보정 ──

  // intent
  if (!VALID_INTENTS.includes(fixed.intent)) {
    errors.push(`잘못된 intent: ${fixed.intent}`);
    fixed.intent = 'general';
  }

  // parking_type
  if (!VALID_PARKING_TYPES.includes(fixed.parking_type)) {
    fixed.parking_type = 'any';
  }

  // fee_type
  if (!VALID_FEE_TYPES.includes(fixed.fee_type)) {
    fixed.fee_type = 'any';
  }

  // max_fee
  if (fixed.max_fee !== null && fixed.max_fee !== undefined) {
    fixed.max_fee = Number(fixed.max_fee);
    if (isNaN(fixed.max_fee) || fixed.max_fee < 0) {
      fixed.max_fee = null;
    }
  } else {
    fixed.max_fee = null;
  }

  // max_distance_km
  if (typeof fixed.max_distance_km !== 'number' || fixed.max_distance_km < 0.5 || fixed.max_distance_km > 50) {
    fixed.max_distance_km = Math.max(0.5, Math.min(50, Number(fixed.max_distance_km) || 5));
  }

  // duration_min
  if (fixed.duration_min !== null && fixed.duration_min !== undefined) {
    fixed.duration_min = Number(fixed.duration_min);
    if (isNaN(fixed.duration_min) || fixed.duration_min < 0) {
      fixed.duration_min = null;
    }
  } else {
    fixed.duration_min = null;
  }

  // top_n
  if (typeof fixed.top_n !== 'number' || fixed.top_n < 1 || fixed.top_n > 10) {
    fixed.top_n = Math.max(1, Math.min(10, Number(fixed.top_n) || 3));
  }

  // sort_by
  if (!VALID_SORT.includes(fixed.sort_by)) {
    fixed.sort_by = 'distance';
  }

  // route_pref
  if (fixed.route_pref && !VALID_ROUTE_PREF.includes(fixed.route_pref)) {
    fixed.route_pref = null;
  }
  if (!fixed.route_pref) fixed.route_pref = null;

  // time_constraint — 문자열 또는 null
  if (fixed.time_constraint && typeof fixed.time_constraint !== 'string') {
    fixed.time_constraint = null;
  }
  if (!fixed.time_constraint) fixed.time_constraint = null;

  // select_index
  if (fixed.select_index !== null && fixed.select_index !== undefined) {
    fixed.select_index = Number(fixed.select_index);
    if (isNaN(fixed.select_index) || fixed.select_index < 1) {
      fixed.select_index = null;
    }
  } else {
    fixed.select_index = null;
  }

  // keywords — 배열
  if (!Array.isArray(fixed.keywords)) {
    fixed.keywords = [];
  }

  // rollback
  if (fixed.rollback !== 'O' && fixed.rollback !== 'X') {
    fixed.rollback = 'X';
  }

  // destination / departure — 문자열 또는 null
  if (fixed.destination && typeof fixed.destination !== 'string') fixed.destination = null;
  if (fixed.departure && typeof fixed.departure !== 'string') fixed.departure = null;
  if (!fixed.destination) fixed.destination = null;
  if (!fixed.departure) fixed.departure = null;

  // ── 논리 충돌 검사 ──

  // 민영 + 무료 → fee_type=any
  if (fixed.parking_type === 'private' && fixed.fee_type === 'free') {
    errors.push('논리 충돌: 민영 + 무료 → fee_type=any');
    fixed.fee_type = 'any';
  }

  // intent=rollback인데 rollback='X' → 자동 보정
  if (fixed.intent === 'rollback' && fixed.rollback !== 'O') {
    fixed.rollback = 'O';
  }

  // route_set인데 목적지도 select_index도 없으면 → 이전 1번 결과 사용 시도
  if (fixed.intent === 'route_set' && !fixed.destination && !fixed.select_index) {
    if (_lastParkingList.length > 0) {
      fixed.select_index = 1;
      errors.push('route_set에 목적지 없음 → 이전 1번 결과 자동 선택');
    } else if (fixed.region) {
      fixed.destination = fixed.region;
    } else {
      errors.push('route_set에 목적지 정보 없음 → find_parking으로 변경');
      fixed.intent = 'find_parking';
    }
  }

  // select_result인데 이전 결과가 없으면 → find_parking
  if (fixed.intent === 'select_result' && _lastParkingList.length === 0) {
    errors.push('select_result인데 이전 결과 없음 → find_parking으로 변경');
    fixed.intent = 'find_parking';
    fixed.select_index = null;
  }

  // select_index 범위가 이전 결과 개수 초과 → 마지막으로 보정
  if (fixed.select_index && _lastParkingList.length > 0) {
    if (fixed.select_index > _lastParkingList.length) {
      fixed.select_index = _lastParkingList.length;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fixed,
  };
}

function getDefaultTable() {
  return {
    intent: 'general',
    region: null,
    destination: null,
    departure: null,
    parking_type: 'any',
    fee_type: 'any',
    max_fee: null,
    max_distance_km: 5,
    duration_min: null,
    sort_by: 'distance',
    top_n: 3,
    route_pref: null,
    time_constraint: null,
    select_index: null,
    keywords: [],
    rollback: 'X',
  };
}

// ── 3) 실제 주차장 데이터 조회 ──────────────────────────
async function fetchParkingData(table, userLat, userLng) {
  const skipIntents = ['rollback', 'cancel', 'general', 'greeting', 'traffic_info'];
  if (skipIntents.includes(table.intent)) {
    return [];
  }

  // select_result / route_set + select_index → 이전 결과에서 뽑기
  if (table.select_index && _lastParkingList.length > 0) {
    const idx = table.select_index - 1;
    if (idx >= 0 && idx < _lastParkingList.length) {
      return [_lastParkingList[idx]];
    }
  }

  // parking_detail → 이전 결과 전체 반환 (상세 정보용)
  if (table.intent === 'parking_detail' && _lastParkingList.length > 0) {
    if (table.select_index) {
      const idx = table.select_index - 1;
      if (idx >= 0 && idx < _lastParkingList.length) return [_lastParkingList[idx]];
    }
    return _lastParkingList;
  }

  // nearby_search → 카카오 장소 검색
  if (table.intent === 'nearby_search') {
    const kw = table.keywords?.join(' ') || table.region || '편의점';
    try {
      const places = await searchPlaces(kw, userLat, userLng);
      return places.slice(0, table.top_n).map(p => ({
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        distance: p.distance ? p.distance / 1000 : null,
        category: p.category,
        phone: p.phone,
        type: 'place',
      }));
    } catch (err) {
      console.log('nearby_search 오류:', err);
      return [];
    }
  }

  // 주차장 검색 계열
  let results = [];
  try {
    let searchLat = userLat;
    let searchLng = userLng;

    // region 또는 destination으로 검색 중심 변경
    const searchKeyword = table.destination || table.region;
    if (searchKeyword) {
      const places = await searchPlaces(searchKeyword, userLat, userLng);
      if (places.length > 0) {
        searchLat = places[0].lat;
        searchLng = places[0].lng;
      }
    }

    const lots = await findNearbyParkingLots(searchLat, searchLng, table.max_distance_km);

    // 필터링
    results = lots.filter(lot => {
      if (table.fee_type === 'free' && lot.fee && !lot.fee.includes('무료')) return false;
      if (table.parking_type === 'public' && lot.fee && lot.fee.includes('민영')) return false;
      return true;
    });

    // 키워드 필터 (선택적 부스팅)
    if (table.keywords && table.keywords.length > 0) {
      const kwLower = table.keywords.map(k => k.toLowerCase());
      results = results.map(lot => {
        const nameAddr = `${lot.name} ${lot.address || ''}`.toLowerCase();
        const matchCount = kwLower.filter(k => nameAddr.includes(k)).length;
        return { ...lot, _kwMatch: matchCount };
      });
      // 키워드 매칭이 있는 것을 우선
      results.sort((a, b) => b._kwMatch - a._kwMatch || a.distance - b.distance);
    }

    // 정렬
    if (table.sort_by === 'distance') {
      results.sort((a, b) => a.distance - b.distance);
    } else if (table.sort_by === 'capacity') {
      results.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
    }
    // price 정렬은 요금 파싱이 복잡하므로 distance로 폴백

    results = results.slice(0, table.top_n);
  } catch (error) {
    console.log('주차장 데이터 조회 오류:', error);
  }

  return results;
}

// ── 3-B) 경로 정보 조회 ─────────────────────────────────
async function fetchRouteInfo(table, selectedParking, userLat, userLng) {
  if (table.intent !== 'route_set') return null;

  let destLat, destLng, destName;

  // 선택된 주차장이 있으면 그 좌표 사용
  if (selectedParking) {
    destLat = selectedParking.lat;
    destLng = selectedParking.lng;
    destName = selectedParking.name;
  } else if (table.destination) {
    // destination 키워드로 검색
    try {
      const places = await searchPlaces(table.destination, userLat, userLng);
      if (places.length > 0) {
        destLat = places[0].lat;
        destLng = places[0].lng;
        destName = places[0].name;
      }
    } catch (err) {
      console.log('목적지 검색 실패:', err);
    }
  }

  if (!destLat || !destLng) return null;

  try {
    const priorityMap = { fastest: 'RECOMMEND', shortest: 'DISTANCE', free: 'TIME' };
    const route = await getDirections(
      { lat: userLat, lng: userLng },
      { lat: destLat, lng: destLng },
      { priority: priorityMap[table.route_pref] || 'RECOMMEND' },
    );
    return {
      destName,
      destLat,
      destLng,
      distance: route.distance,     // 미터
      duration: route.duration,     // 초
      fare: route.fare,
    };
  } catch (err) {
    console.log('경로 조회 실패:', err);
    return { destName, destLat, destLng, distance: null, duration: null, fare: null, error: true };
  }
}

// ── 4) 답변 생성 ────────────────────────────────────────
async function generateAnswer(table, parkingData, routeInfo, userText) {
  // 주차장 데이터 문자열
  let dataStr;
  if (parkingData.length > 0) {
    if (parkingData[0]?.type === 'place') {
      // nearby_search 결과
      dataStr = parkingData
        .map((p, i) =>
          `${i + 1}. ${p.name} — 거리: ${p.distance != null ? (p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`) : '?'}, 주소: ${p.address || '?'}, 분류: ${p.category || '?'}`
        ).join('\n');
    } else {
      dataStr = parkingData
        .map((p, i) =>
          `${i + 1}. ${p.name} — 거리: ${p.distance != null ? (p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`) : '?'}, 주소: ${p.address || '?'}, 주차면: ${p.capacity || '?'}대, 요금: ${p.fee || '정보 없음'}`
        ).join('\n');
    }
  } else {
    dataStr = '조건에 맞는 결과를 찾지 못했습니다.';
  }

  // 경로 정보 문자열
  let routeStr = '';
  if (routeInfo) {
    if (routeInfo.error) {
      routeStr = `\n경로 정보: ${routeInfo.destName}까지 경로 조회에 실패했습니다.`;
    } else if (routeInfo.distance != null) {
      const distKm = (routeInfo.distance / 1000).toFixed(1);
      const durMin = Math.round(routeInfo.duration / 60);
      routeStr = `\n경로 정보: ${routeInfo.destName}까지 약 ${distKm}km, 예상 ${durMin}분 소요.`;
    }
  }

  const userContent = `사용자 요청: "${userText}"

분류 테이블:
${JSON.stringify(table, null, 2)}

조회 데이터:
${dataStr}${routeStr}

위 정보를 바탕으로 네비게이션 AI 톤으로 간결하게 답변하라.`;

  return callGPT(MODEL_ANSWER, ANSWER_SYSTEM_PROMPT, userContent, 0.4);
}

// ── 5) 메인 파이프라인 ──────────────────────────────────
/**
 * @param {string} userText        사용자 발화
 * @param {number} userLat         사용자 위치 위도
 * @param {number} userLng         사용자 위치 경도
 * @param {string} conversationCtx 이전 대화 요약 (최근 4개 메시지)
 * @returns {{ text: string, table: object, parkingList: Array, routeInfo: object|null, rolledBack: boolean }}
 */
export async function processUserMessage(userText, userLat, userLng, conversationCtx = '') {
  // ① 분류
  const rawTable = await classifyRequest(userText, conversationCtx);
  console.log('GPT classify →', JSON.stringify(rawTable));

  // ② 검증
  const { valid, errors, fixed } = validateTable(rawTable);
  if (!valid) {
    console.log('테이블 검증 보정:', errors);
  }
  const table = fixed;

  // ③ 롤백 처리
  if (table.rollback === 'O') {
    let rolledBack = false;
    if (_tableHistory.length > 0) {
      _lastTable = _tableHistory.pop();
      _lastParkingList = [];
      _lastRouteInfo = null;
      rolledBack = true;
    }
    const text = rolledBack
      ? '이전 안내를 취소합니다. 다시 검색하시겠습니까?'
      : '취소할 이전 내역이 없습니다. 목적지를 말씀해주세요.';
    return { text, table, parkingList: [], routeInfo: null, rolledBack };
  }

  // ④ 데이터 조회
  const parkingList = await fetchParkingData(table, userLat, userLng);

  // ⑤ 경로 조회 (route_set만)
  let routeInfo = null;
  if (table.intent === 'route_set') {
    const selectedParking = parkingList.length === 1 ? parkingList[0] : null;
    routeInfo = await fetchRouteInfo(table, selectedParking, userLat, userLng);
    _lastRouteInfo = routeInfo;
  }

  // ⑥ 답변 생성
  const text = await generateAnswer(table, parkingList, routeInfo, userText);

  // ⑦ 히스토리 저장
  const skipSave = ['general', 'cancel', 'greeting'];
  if (!skipSave.includes(table.intent)) {
    if (_lastTable) {
      _tableHistory.push(_lastTable);
      if (_tableHistory.length > 10) _tableHistory.shift();
    }
    _lastTable = table;

    // 주차장 결과 저장 — select/route에서 1개 뽑은 건 원본 리스트를 유지
    const isSelectionFromList = table.select_index && ['route_set', 'select_result'].includes(table.intent);
    if (!isSelectionFromList && parkingList.length > 0 && !parkingList[0]?.type) {
      _lastParkingList = parkingList;
    }
  }

  // action 지정: route_set이고 유효한 routeInfo가 있으면 navigateToMap
  const action = (table.intent === 'route_set' && routeInfo && !routeInfo.error && routeInfo.destLat)
    ? 'navigateToMap'
    : null;

  return { text, table, parkingList, routeInfo, rolledBack: false, action };
}
