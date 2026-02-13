/**
 * 주정차 금지구역 감지 & 3분 경고 서비스
 * 
 * 기능:
 * 1. 백엔드 API(Spring Boot /api/pas/parking-stop-check) 호출로 좌표 기반 금지구역 판정
 * 2. 내장 데이터 폴백 (백엔드 미연결 시에도 동작)
 * 3. 현재 위치가 금지구역에 3분 이상 머물면 경고
 * 
 * 백엔드: POST /api/pas/parking-stop-check  { x: lng, y: lat }
 *         → { prohibited: boolean, roadAddress: string }
 */

import { API_BASE_URL } from '../config/api';

// ─── 설정 ──────────────────────────────────────
const ZONE_RADIUS_M = 35;        // 내장 데이터 감지 반경 (m)
const WARNING_TIME_MS = 180000;  // 3분 (ms)
const CHECK_INTERVAL_MS = 10000; // 10초마다 경과 체크
const BACKEND_TIMEOUT_MS = 5000; // 백엔드 API 타임아웃

// ─── 서울 주요 주정차 금지구역 내장 데이터 ─────────
// (API 키 미발급 시 폴백용 — 실제 주정차금지구역 좌표)
const BUILT_IN_ZONES = [
  // 강남구
  { name: '강남대로 주정차금지', lat: 37.497942, lng: 127.027619, address: '서울 강남구 강남대로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '테헤란로 주정차금지', lat: 37.500685, lng: 127.036742, address: '서울 강남구 테헤란로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '역삼역 주정차금지', lat: 37.500622, lng: 127.036456, address: '서울 강남구 역삼동', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2000' },
  { name: '삼성역 주정차금지', lat: 37.508844, lng: 127.060722, address: '서울 강남구 삼성동', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '봉은사로 주정차금지', lat: 37.514575, lng: 127.060760, address: '서울 강남구 봉은사로', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2000' },
  // 서초구
  { name: '서초대로 주정차금지', lat: 37.491860, lng: 127.007803, address: '서울 서초구 서초대로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '반포대로 주정차금지', lat: 37.504506, lng: 127.004923, address: '서울 서초구 반포대로', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2000' },
  // 종로구
  { name: '종로 주정차금지', lat: 37.570149, lng: 126.982384, address: '서울 종로구 종로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '세종대로 주정차금지', lat: 37.572425, lng: 126.976886, address: '서울 종로구 세종대로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2200' },
  // 중구
  { name: '을지로 주정차금지', lat: 37.565867, lng: 126.982370, address: '서울 중구 을지로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '명동길 주정차금지', lat: 37.563707, lng: 126.985388, address: '서울 중구 명동길', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2200' },
  // 마포구
  { name: '마포대로 주정차금지', lat: 37.553083, lng: 126.956252, address: '서울 마포구 마포대로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '홍대입구 주정차금지', lat: 37.556714, lng: 126.923580, address: '서울 마포구 양화로', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2200' },
  // 영등포구
  { name: '여의대로 주정차금지', lat: 37.521659, lng: 126.924145, address: '서울 영등포구 여의대로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  // 송파구
  { name: '올림픽로 주정차금지', lat: 37.515133, lng: 127.103855, address: '서울 송파구 올림픽로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  { name: '석촌호수 주정차금지', lat: 37.510138, lng: 127.101773, address: '서울 송파구 석촌호수', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2000' },
  // 용산구
  { name: '이태원로 주정차금지', lat: 37.534511, lng: 126.994202, address: '서울 용산구 이태원로', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2200' },
  // 성동구
  { name: '왕십리로 주정차금지', lat: 37.561290, lng: 127.037860, address: '서울 성동구 왕십리로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  // 광진구
  { name: '광나루로 주정차금지', lat: 37.538453, lng: 127.085652, address: '서울 광진구 광나루로', type: '주정차금지', days: '매일', startTime: '0700', endTime: '2100' },
  // 동대문구
  { name: '천호대로 주정차금지(동대문)', lat: 37.574576, lng: 127.025187, address: '서울 동대문구 천호대로', type: '주정차금지', days: '매일', startTime: '0800', endTime: '2000' },
];

// ─── Haversine 거리 계산 (m) ──────────────────
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 현재 시간이 금지 시간대인지 체크 ──────────
function isCurrentlyRestricted(zone) {
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
  const inTimeRange = hhmm >= zone.startTime && hhmm <= zone.endTime;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const today = dayNames[now.getDay()];
  const days = zone.days || '매일';
  const dayMatch = days === '매일' || days.includes('전일') || days.includes(today);
  return inTimeRange && dayMatch;
}

// ─── 백엔드 API 호출: 좌표 → 금지구역 여부 ────
async function checkProhibitedViaBackend(lat, lng) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}/api/pas/parking-stop-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: lng, y: lat }), // x=경도, y=위도
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn('[NoParkingZone] 백엔드 응답 오류:', response.status);
      return null;
    }

    const data = await response.json();
    // { prohibited: boolean, roadAddress: string }
    console.log(`[NoParkingZone] 백엔드 응답: prohibited=${data.prohibited}, road=${data.roadAddress}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[NoParkingZone] 백엔드 타임아웃');
    } else {
      console.warn('[NoParkingZone] 백엔드 호출 실패:', err.message);
    }
    return null;
  }
}

// ─── 내장 데이터 폴백 확인 ─────────────────────
function checkBuiltInZones(lat, lng) {
  for (const zone of BUILT_IN_ZONES) {
    const dist = distanceM(lat, lng, zone.lat, zone.lng);
    if (dist <= ZONE_RADIUS_M && isCurrentlyRestricted(zone)) {
      return zone;
    }
  }
  return null;
}

// ─── 3분 체류 감지 엔진 ────────────────────────

/**
 * createNoParkingZoneMonitor
 * 
 * 사용법:
 *   const monitor = createNoParkingZoneMonitor(onWarning, onClear);
 *   // 위치 업데이트마다 호출:
 *   monitor.checkLocation(lat, lng);
 *   // 정리:
 *   monitor.destroy();
 * 
 * onWarning(zone, staySeconds) — 3분 이상 체류 시 호출
 * onClear() — 금지구역에서 벗어났을 때 호출
 */
export function createNoParkingZoneMonitor(onWarning, onClear) {
  let enteredZone = null;       // 현재 진입한 금지구역
  let enterTime = 0;            // 진입 시각 (ms)
  let warningFired = false;     // 경고가 이미 발생했는지
  let checkTimer = null;        // 주기 타이머
  let lastLat = null;
  let lastLng = null;
  let destroyed = false;

  // 타이머: 진입 후 경과 시간 체크
  function startTimer() {
    stopTimer();
    checkTimer = setInterval(() => {
      if (!enteredZone || !enterTime) return;

      const elapsed = Date.now() - enterTime;
      if (elapsed >= WARNING_TIME_MS && !warningFired) {
        warningFired = true;
        const staySeconds = Math.floor(elapsed / 1000);
        onWarning(enteredZone, staySeconds);
      }
    }, CHECK_INTERVAL_MS);
  }

  function stopTimer() {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }

  /**
   * 위치 업데이트 시 호출
   * 1차: 백엔드 API (/api/pas/parking-stop-check)
   * 2차: 내장 데이터 폴백
   */
  async function checkLocation(lat, lng) {
    if (destroyed) return;
    lastLat = lat;
    lastLng = lng;

    try {
      let insideZone = null;

      // 1차: 백엔드 API 호출
      const backendResult = await checkProhibitedViaBackend(lat, lng);
      if (backendResult && backendResult.prohibited) {
        insideZone = {
          name: '주정차 금지구역',
          address: backendResult.roadAddress || '주소 확인 중',
          lat, lng,
          type: '주정차금지',
          days: '매일',
          startTime: '0000',
          endTime: '2359',
        };
      }

      // 2차: 백엔드 실패/미금지 → 내장 데이터로 확인
      if (!insideZone) {
        insideZone = checkBuiltInZones(lat, lng);
      }

      if (insideZone) {
        const zoneKey = insideZone.address || insideZone.name;
        // 같은 구역에 계속 있는지 확인
        if (enteredZone && (enteredZone.address || enteredZone.name) === zoneKey) {
          // 이미 진입 중 — 타이머가 알아서 처리
          return;
        }

        // 새 구역 진입
        enteredZone = insideZone;
        enterTime = Date.now();
        warningFired = false;
        startTimer();
        console.log(`[NoParkingZone] 금지구역 진입: ${insideZone.name} — ${insideZone.address}`);
      } else {
        // 금지구역 밖
        if (enteredZone) {
          console.log(`[NoParkingZone] 금지구역 이탈: ${enteredZone.name}`);
          enteredZone = null;
          enterTime = 0;
          warningFired = false;
          stopTimer();
          onClear();
        }
      }
    } catch (err) {
      console.warn('[NoParkingZone] 체크 오류:', err.message);
    }
  }

  function getStatus() {
    if (!enteredZone) return { inZone: false };
    const elapsed = Date.now() - enterTime;
    return {
      inZone: true,
      zone: enteredZone,
      elapsedMs: elapsed,
      elapsedSeconds: Math.floor(elapsed / 1000),
      warningFired,
    };
  }

  function destroy() {
    destroyed = true;
    stopTimer();
    enteredZone = null;
    enterTime = 0;
  }

  return {
    checkLocation,
    getStatus,
    destroy,
  };
}

export default {
  createNoParkingZoneMonitor,
  checkProhibitedViaBackend,
  ZONE_RADIUS_M,
  WARNING_TIME_MS,
};
