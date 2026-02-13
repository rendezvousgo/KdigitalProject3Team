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
import { GPT_API_KEY } from '../config/keys';

// ── GPT API 설정 ──────────────────────────────────────────

const MODEL_CLASSIFY = 'gpt-4.1-mini';   // nano→mini 업그레이드: JSON 분류 정확도 대폭 향상
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
  "waypoints": "[string] (경유지 장소명 배열, 순서대로)",
  "waypoint_indices": "[number] (이전 결과 번호로 경유지 지정, 1-based)",
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

nearby_search — 주차장이 아닌 주변 시설/장소 검색
  "근처 편의점", "주변 화장실", "가까운 주유소", "맛집 추천해줘", "근처 음식점", "주변 카페", "가까운 약국"
  ※ 맛집, 음식점, 카페, 주유소, 편의점, 약국 등 시설 검색·추천 요청은 반드시 nearby_search로 분류. recommend_parking이 아님!

traffic_info — 교통/도로 상황 문의
  "지금 길 막혀?", "정체 심해?", "빠른 길로 가줘"

cancel — 현재 작업 취소
  "취소", "됐어", "그만"

rollback — 이전 상태로 되돌리기
  "아니야", "다른 거", "그거 말고", "다시 찾아줘", "마음에 안 들어"
  ※ rollback="O"으로 설정

greeting — 인사/안부
  "안녕", "고마워", "수고해"

general — 위에 해당 안 되는 일반 대화 (날씨, 뉴스, 일반 상식 등)
  ※ 날씨, 뉴스, 계산, 일반 상식 등 장소/경로와 무관한 질문만 general

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
14. "○○ 거쳐서 △△ 가줘", "○○ 들렀다 △△" → intent=route_set, waypoints=["○○"], destination="△△"
15. "○○이랑 △△ 거쳐서 □□" → waypoints=["○○","△△"], destination="□□"
16. "1번 경유하고 2번 목적지" → intent=route_set, waypoint_indices=[1], select_index=2
17. "1번이랑 3번 거쳐서 2번으로" → intent=route_set, waypoint_indices=[1,3], select_index=2
18. "천안시청 경유하고 1번으로" → intent=route_set, waypoints=["천안시청"], select_index=1
19. "1번 경유하고 천안시청" → intent=route_set, waypoint_indices=[1], destination="천안시청"
20. 이전 결과 번호를 경유지로 쓰면 waypoint_indices, 장소명이면 waypoints에 넣어라. 둘 다 있을 수 있다.
21. "맛집","음식점","카페","편의점","주유소","약국","병원","은행","마트" 등 nearby_search 시설 키워드 → keywords 배열에 반드시 넣어라. region이 아닌 keywords에 넣어라.

※ 이전 대화 맥락이 주어지면 반드시 참고하여 "그쪽","거기","그거" 등 지시어를 해석하라.
※ 맥락 없이 모호하면 find_parking으로 분류하라.`;

// ── 답변 프롬프트 ─────────────────────────────────────────
const ANSWER_SYSTEM_PROMPT = `너는 SafeParking 차량 내비게이션 AI이다.
주차장 검색, 경로 안내, 주변 시설 검색, 교통 정보를 답한다.

═══ 핵심 원칙 ═══
1. 모르면 "죄송합니다. 해당 정보는 제공하기 어렵습니다." 라고 답하라.
2. 조회 데이터에 없는 정보를 절대 지어내지 마라.
3. 조회 데이터가 "조건에 맞는 결과를 찾지 못했습니다"이면 솔직히 없다고 답하라. 임의 장소를 만들어내지 마라.
4. 날씨, 뉴스, 일반 상식 등 장소/경로와 무관한 질문엔 "주차장, 경로 안내, 주변 시설 검색만 도와드릴 수 있습니다."라고 답하라.
5. 최대한 짧게 답하라. 2~3문장 이내.

═══ 말투 ═══
- 존댓말, 간결체 ("~입니다", "~하세요")
- 이모지, 과잉 친절 표현 금지

═══ 답변 형식 ═══

[주차장 결과 있을 때]
"주변 주차장 N곳입니다."
각 주차장: 이름, 거리, 요금만. 번호로 선택 유도.

[주차장 결과 없을 때]
"해당 지역에서 주차장을 찾지 못했습니다."

[경로 안내]
"○○까지 약 N분, N.Nkm입니다."

[주변 시설 검색 결과]
"주변 음식점/카페/주유소 N곳입니다."
각 시설: 이름, 거리, 분류만. 번호로 선택 유도.

[인사]
"안녕하세요. 목적지를 말씀해주세요."

[주변 시설 결과 있을 때]
"주변 시설 N곳입니다."
각 시설: 이름, 거리만. 번호로 선택 유도.

[범위 밖 질문]
"주차장 검색, 경로 안내, 주변 시설 검색만 도와드릴 수 있습니다."

═══ 금지 ═══
- 장황한 설명, 부연, 추천 이유 나열 금지
- 데이터에 없는 장소를 추측/생성 금지
- 장소/경로와 무관한 날씨/뉴스/일반상식 답변 금지
- "물론이죠!", "도와드릴게요~" 등 과잉 표현 금지`;

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

// ── OpenAI API 호출 (자동 리트라이 포함) ──────────────────
const MAX_RETRIES = 2;

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

  const jsonBody = JSON.stringify(body);
  console.log(`[callGPT] 요청: model=${model}, body크기=${jsonBody.length}bytes`);

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = 1000 * attempt;
      console.log(`[callGPT] 재시도 ${attempt}/${MAX_RETRIES} (${delay}ms 대기)`);
      await new Promise(r => setTimeout(r, delay));
    }

    let res;
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${GPT_API_KEY}`,
          'Accept': 'application/json',
        },
        body: jsonBody,
      });
    } catch (fetchErr) {
      console.log(`[callGPT] 네트워크 에러 (시도${attempt}):`, fetchErr.message);
      lastError = new Error(`GPT API 네트워크 오류: ${fetchErr.message}`);
      continue; // 리트라이
    }

    console.log(`[callGPT] 응답: status=${res.status} (시도${attempt})`);

    // 성공
    if (res.ok) {
      try {
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content?.trim() ?? '';
        console.log(`[callGPT] 성공: ${answer.slice(0, 80)}...`);
        return answer;
      } catch (parseErr) {
        console.log('[callGPT] 응답 JSON 파싱 실패:', parseErr.message);
        lastError = new Error(`GPT API 응답 파싱 오류: ${parseErr.message}`);
        continue;
      }
    }

    // 에러 응답
    let errText = '';
    try { errText = await res.text(); } catch (_) {}
    console.log(`[callGPT] API 에러: ${res.status} ${errText.slice(0, 300)}`);

    // 429(Rate Limit), 500+는 리트라이 가능
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`GPT API 오류 (${res.status}): ${errText.slice(0, 150)}`);
      continue; // 리트라이
    }

    // 400, 401, 403 등은 리트라이해도 안 됨
    throw new Error(`GPT API 오류 (${res.status}): ${errText.slice(0, 150)}`);
  }

  // 모든 리트라이 소진
  throw lastError || new Error('GPT API 알 수 없는 오류');
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

  // waypoints — 배열
  if (!Array.isArray(fixed.waypoints)) {
    fixed.waypoints = [];
  }
  // 빈 문자열 제거
  fixed.waypoints = fixed.waypoints.filter(w => typeof w === 'string' && w.trim());

  // waypoint_indices — 이전 결과 번호로 경유지 지정
  if (!Array.isArray(fixed.waypoint_indices)) {
    fixed.waypoint_indices = [];
  }
  fixed.waypoint_indices = fixed.waypoint_indices
    .map(Number)
    .filter(n => !isNaN(n) && n >= 1);
  // 이전 결과 범위 초과 → 마지막으로 보정
  if (fixed.waypoint_indices.length > 0 && _lastParkingList.length > 0) {
    fixed.waypoint_indices = fixed.waypoint_indices.map(idx =>
      idx > _lastParkingList.length ? _lastParkingList.length : idx
    );
  }
  // 이전 결과가 없는데 waypoint_indices가 있으면 → 무시
  if (fixed.waypoint_indices.length > 0 && _lastParkingList.length === 0) {
    errors.push('waypoint_indices 있지만 이전 결과 없음 → 무시');
    fixed.waypoint_indices = [];
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

  // route_set인데 목적지도 select_index도 없으면 → region 우선, 없으면 재요청
  if (fixed.intent === 'route_set' && !fixed.destination && !fixed.select_index) {
    if (fixed.region) {
      // ★ region을 destination으로 승격 (이전 결과보다 우선)
      fixed.destination = fixed.region;
      errors.push('route_set: region을 destination으로 승격');
    } else if (_lastParkingList.length > 0) {
      fixed.select_index = 1;
      errors.push('route_set에 목적지 없음 → 이전 1번 결과 자동 선택');
    } else {
      // 목적지 정보 전무 → 재요청
      fixed.intent = '_clarify';
      fixed._clarifyReason = 'no_destination';
      errors.push('route_set에 목적지 정보 없음 → 재요청');
    }
  }

  // select_result인데 이전 결과가 없으면 → 재요청
  if (fixed.intent === 'select_result' && _lastParkingList.length === 0) {
    fixed.intent = '_clarify';
    fixed._clarifyReason = 'no_previous_results';
    errors.push('select_result인데 이전 결과 없음 → 재요청');
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
    waypoints: [],
    waypoint_indices: [],
    rollback: 'X',
  };
}

// ── 3) 실제 주차장 데이터 조회 ──────────────────────────
async function fetchParkingData(table, userLat, userLng) {
  const skipIntents = ['rollback', 'cancel', 'general', 'greeting', 'traffic_info'];
  if (skipIntents.includes(table.intent)) {
    return [];
  }

  // route_set에서 destination만 있으면 경로만 필요, 주차장 검색 불필요
  if (table.intent === 'route_set' && !table.select_index) {
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
    let kw = table.keywords?.join(' ') || table.region || table.destination || '편의점';
    // ★ 맛집 → 음식점 매핑 (카카오 API 정확도 향상)
    kw = kw.replace(/맛집/g, '음식점').replace(/밥집/g, '음식점').replace(/식당/g, '음식점');
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
      } else {
        // ★ 검색 키워드로 장소를 찾지 못함 → 현 위치 fallback 대신 재요청
        console.log(`[fetchParkingData] '${searchKeyword}' 장소 검색 실패 → 재요청`);
        return { _clarify: true, reason: 'location_not_found', keyword: searchKeyword };
      }
    }

    const lots = await findNearbyParkingLots(searchLat, searchLng, table.max_distance_km);

    // 필터링
    results = lots.filter(lot => {
      if (table.fee_type === 'free' && lot.fee && !lot.fee.includes('무료')) return false;
      if (table.parking_type === 'public' && lot.fee && lot.fee.includes('민영')) return false;
      return true;
    });

    // ── 공공데이터 부족 시 카카오 장소 검색으로 보완 ──
    // 가까운 주차장이 부족하거나(top_n 미만) 가장 가까운 결과도 5km 초과이면
    const nearEnough = results.filter(r => r.distance <= 5);
    if (nearEnough.length < table.top_n) {
      try {
        const kakaoKeyword = searchKeyword ? `${searchKeyword} 주차장` : '주차장';
        const kakaoResults = await searchPlaces(kakaoKeyword, searchLat, searchLng);
        const kakaoParking = kakaoResults
          .filter(p => p.category?.includes('주차장') || p.name?.includes('주차'))
          .map(p => ({
            name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            distance: p.distance ? p.distance / 1000 : null,
            capacity: null,
            fee: null,
            phone: p.phone || null,
            source: 'kakao',
          }));
        // 공공데이터 결과 뒤에 카카오 결과 합치기 (공공 우선)
        results = [...results, ...kakaoParking];
      } catch (kakaoErr) {
        console.log('카카오 주차장 보완 검색 오류:', kakaoErr);
      }
    }

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

    // 최종 중복 제거: 이름 또는 좌표 근접(50m 이내) 기준
    const dedupResults = [];
    for (const lot of results) {
      const isDup = dedupResults.some(existing => {
        // 이름 완전 일치
        if (existing.name === lot.name) return true;
        // 좌표 50m 이내 + 이름 유사
        if (existing.lat && lot.lat) {
          const dist = Math.sqrt(
            Math.pow((existing.lat - lot.lat) * 111320, 2) +
            Math.pow((existing.lng - lot.lng) * 111320 * Math.cos(lot.lat * Math.PI / 180), 2)
          );
          if (dist < 50) return true;
        }
        return false;
      });
      if (!isDup) dedupResults.push(lot);
      if (dedupResults.length >= table.top_n) break;
    }
    results = dedupResults;
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
    const dirOptions = { priority: priorityMap[table.route_pref] || 'RECOMMEND' };

    // ── 경유지 처리 (인덱스 + 장소명 통합) ──
    let waypointNames = [];
    const wpCoords = [];

    // 1) waypoint_indices: 이전 결과 번호 → 좌표/이름 변환
    if (table.waypoint_indices && table.waypoint_indices.length > 0) {
      for (const idx of table.waypoint_indices) {
        const item = _lastParkingList[idx - 1];
        if (item && item.lat && item.lng) {
          wpCoords.push({ lat: item.lat, lng: item.lng });
          waypointNames.push(item.name || `${idx}번`);
        }
      }
    }

    // 2) waypoints: 장소명 → 카카오 검색으로 좌표 변환
    if (table.waypoints && table.waypoints.length > 0) {
      for (const wpName of table.waypoints) {
        try {
          const wpPlaces = await searchPlaces(wpName, userLat, userLng);
          if (wpPlaces.length > 0) {
            wpCoords.push({ lat: wpPlaces[0].lat, lng: wpPlaces[0].lng });
            waypointNames.push(wpPlaces[0].name);
          }
        } catch (e) {
          console.log(`경유지 '${wpName}' 검색 실패:`, e);
        }
      }
    }

    if (wpCoords.length > 0) {
      dirOptions.waypoints = wpCoords;
    }

    const route = await getDirections(
      { lat: userLat, lng: userLng },
      { lat: destLat, lng: destLng },
      dirOptions,
    );
    return {
      destName,
      destLat,
      destLng,
      distance: route.distance,     // 미터
      duration: route.duration,     // 초
      fare: route.fare,
      waypointNames,
      waypointCoords: wpCoords,
    };
  } catch (err) {
    console.log('경로 조회 실패:', err);
    return { destName, destLat, destLng, distance: null, duration: null, fare: null, error: true, waypointCoords: [] };
  }
}

// ── 거리 포맷 헬퍼 (km 단위 입력) ──
function fmtDistKm(d) {
  if (d == null || isNaN(d)) return '?';
  if (d < 0.01) return '근처';
  if (d < 1) return `${Math.round(d * 1000)}m`;
  return `${d.toFixed(1)}km`;
}
// ── 거리 포맷 헬퍼 (m 단위 입력) ──
function fmtDistM(d) {
  if (d == null || isNaN(d)) return '?';
  if (d < 1000) return `${Math.round(d)}m`;
  return `${(d / 1000).toFixed(1)}km`;
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
          `${i + 1}. ${p.name} — 거리: ${fmtDistKm(p.distance)}, 주소: ${p.address || '?'}, 분류: ${p.category || '?'}`
        ).join('\n');
    } else {
      dataStr = parkingData
        .map((p, i) =>
          `${i + 1}. ${p.name} — 거리: ${fmtDistKm(p.distance)}, 주소: ${p.address || '?'}, 주차면: ${p.capacity || '?'}대, 요금: ${p.fee || '정보 없음'}`
        ).join('\n');
    }
  } else {
    dataStr = table.intent === 'route_set'
      ? '(경로 안내 요청 - 주차장 데이터 불필요)'
      : '조건에 맞는 결과를 찾지 못했습니다.';
  }

  // 경로 정보 문자열 (distance는 미터 단위)
  let routeStr = '';
  if (routeInfo) {
    if (routeInfo.error) {
      routeStr = `\n경로 정보: ${routeInfo.destName}까지 경로 조회에 실패했습니다.`;
    } else if (routeInfo.distance != null) {
      const durMin = Math.round(routeInfo.duration / 60);
      const wpPart = routeInfo.waypointNames?.length
        ? ` (경유지: ${routeInfo.waypointNames.join(' → ')})`
        : '';
      routeStr = `\n경로 정보: ${routeInfo.destName}까지${wpPart} 약 ${fmtDistM(routeInfo.distance)}, 예상 ${durMin}분 소요.`;
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

  // ②-B 재요청 분기 (validateTable에서 _clarify로 변환된 경우)
  if (table.intent === '_clarify') {
    const clarifyMessages = {
      no_destination: '어디로 안내해드릴까요? 목적지를 말씀해주세요.',
      no_previous_results: '이전 검색 결과가 없습니다. 먼저 주차장을 검색해주세요.',
    };
    const text = clarifyMessages[table._clarifyReason] || '다시 한번 말씀해주세요.';
    return { text, table, parkingList: [], routeInfo: null, rolledBack: false, needsClarification: true };
  }

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
    return { text, table, parkingList: [], routeInfo: null, rolledBack, needsClarification: true };
  }

  // ④ 데이터 조회
  const parkingList = await fetchParkingData(table, userLat, userLng);

  // ④-B 데이터 조회에서 재요청이 온 경우 (장소 검색 실패 등)
  if (parkingList && parkingList._clarify) {
    const reason = parkingList.reason;
    const kw = parkingList.keyword || '';
    let text;
    if (reason === 'location_not_found') {
      text = `'${kw}' 지역을 찾지 못했습니다. 다른 지역명이나 더 구체적인 장소를 말씀해주세요.`;
    } else {
      text = '검색 조건을 확인할 수 없습니다. 다시 말씀해주세요.';
    }
    return { text, table, parkingList: [], routeInfo: null, rolledBack: false, needsClarification: true };
  }

  // ⑤ 경로 조회 (route_set만)
  let routeInfo = null;
  _lastRouteInfo = null; // ★ 이전 경로 정보 초기화 (잔존값 방지)
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
