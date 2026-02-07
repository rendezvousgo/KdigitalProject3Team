/**
 * 주정차금지구역 API - 샘플 데이터 구조 분석
 * (실제 API 연결 전 데이터 스키마 확인용)
 */

// 공공데이터포털 표준데이터 예상 응답 구조
const SAMPLE_NO_PARKING_ZONE = {
  response: {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE."
    },
    body: {
      items: [
        {
          // 기본정보
          prhibtAreaNm: "강남대로 주정차금지구역",          // 금지구역명
          ctprvnNm: "서울특별시",                        // 시도명
          signguNm: "강남구",                            // 시군구명
          
          // 위치정보
          rdnmadr: "서울특별시 강남구 강남대로 123",      // 도로명주소
          lnmadr: "서울특별시 강남구 역삼동 123-45",      // 지번주소
          latitude: 37.497942,                          // 위도
          longitude: 127.027619,                        // 경도
          
          // 금지정보
          prhibtSeNm: "주정차금지",                      // 금지구분명
          prhibtDayNm: "월~금",                         // 금지요일명
          operBeginHhmm: "0700",                        // 운영시작시각
          operEndHhmm: "2100",                          // 운영종료시각
          prhibtRsnCn: "교통 혼잡 방지",                 // 금지사유내용
          
          // 기타
          institutionNm: "강남구청",                     // 관리기관명
          phoneNumber: "02-3423-5114",                  // 전화번호
          referenceDate: "2024-12-31",                  // 기준일자
          insttCode: "1168000000",                      // 기관코드
        }
      ],
      pageNo: 1,
      numOfRows: 10,
      totalCount: 15234
    }
  }
};

console.log("📋 예상 데이터 구조:");
console.log(JSON.stringify(SAMPLE_NO_PARKING_ZONE, null, 2));

// 앱에서 활용할 데이터 매핑
function mapNoParkingZone(apiData) {
  return {
    id: `${apiData.ctprvnNm}_${apiData.signguNm}_${apiData.prhibtAreaNm}`,
    name: apiData.prhibtAreaNm,
    type: apiData.prhibtSeNm,
    
    // 위치
    address: apiData.rdnmadr || apiData.lnmadr,
    location: {
      lat: parseFloat(apiData.latitude),
      lng: parseFloat(apiData.longitude),
    },
    
    // 금지 시간
    restrictedDays: apiData.prhibtDayNm,
    restrictedHours: `${apiData.operBeginHhmm}~${apiData.operEndHhmm}`,
    startTime: apiData.operBeginHhmm,
    endTime: apiData.operEndHhmm,
    
    // 추가정보
    reason: apiData.prhibtRsnCn,
    authority: apiData.institutionNm,
    phone: apiData.phoneNumber,
    lastUpdated: apiData.referenceDate,
  };
}

console.log("\n📱 앱용 매핑 데이터:");
console.log(JSON.stringify(
  mapNoParkingZone(SAMPLE_NO_PARKING_ZONE.response.body.items[0]), 
  null, 
  2
));

// 위험도 계산 로직
function calculateDangerLevel(zone, currentTime) {
  // 현재 시간이 금지시간대인지 체크
  const now = currentTime || new Date();
  const currentHour = now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0');
  
  const isRestricted = currentHour >= zone.startTime && currentHour <= zone.endTime;
  
  // 요일 체크 (간단 구현)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const currentDay = dayNames[now.getDay()];
  const isDayRestricted = zone.restrictedDays?.includes(currentDay);
  
  return {
    isDangerous: isRestricted && isDayRestricted,
    level: (isRestricted && isDayRestricted) ? 'HIGH' : 'SAFE',
    message: (isRestricted && isDayRestricted) 
      ? `⚠️ 현재 주정차 금지시간입니다 (${zone.restrictedHours})`
      : `✅ 현재 주정차 가능 시간입니다`,
  };
}

const sampleZone = mapNoParkingZone(SAMPLE_NO_PARKING_ZONE.response.body.items[0]);
console.log("\n🚨 위험도 분석:");
console.log(calculateDangerLevel(sampleZone));

module.exports = { mapNoParkingZone, calculateDangerLevel };
