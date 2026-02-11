/**
 * 二쇱젙李④툑吏援ъ뿭 API - ?섑뵆 ?곗씠??援ъ“ 遺꾩꽍
 * (?ㅼ젣 API ?곌껐 ???곗씠???ㅽ궎留??뺤씤??
 */

// 怨듦났?곗씠?고룷???쒖??곗씠???덉긽 ?묐떟 援ъ“
const SAMPLE_NO_PARKING_ZONE = {
  response: {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE."
    },
    body: {
      items: [
        {
          // 湲곕낯?뺣낫
          prhibtAreaNm: "媛뺣궓?濡?二쇱젙李④툑吏援ъ뿭",          // 湲덉?援ъ뿭紐?
          ctprvnNm: "?쒖슱?밸퀎??,                        // ?쒕룄紐?
          signguNm: "媛뺣궓援?,                            // ?쒓뎔援щ챸
          
          // ?꾩튂?뺣낫
          rdnmadr: "?쒖슱?밸퀎??媛뺣궓援?媛뺣궓?濡?123",      // ?꾨줈紐낆＜??
          lnmadr: "?쒖슱?밸퀎??媛뺣궓援???궪??123-45",      // 吏踰덉＜??
          latitude: 37.497942,                          // ?꾨룄
          longitude: 127.027619,                        // 寃쎈룄
          
          // 湲덉??뺣낫
          prhibtSeNm: "二쇱젙李④툑吏",                      // 湲덉?援щ텇紐?
          prhibtDayNm: "??湲?,                         // 湲덉??붿씪紐?
          operBeginHhmm: "0700",                        // ?댁쁺?쒖옉?쒓컖
          operEndHhmm: "2100",                          // ?댁쁺醫낅즺?쒓컖
          prhibtRsnCn: "援먰넻 ?쇱옟 諛⑹?",                 // 湲덉??ъ쑀?댁슜
          
          // 湲고?
          institutionNm: "媛뺣궓援ъ껌",                     // 愿由ш린愿紐?
          phoneNumber: "02-3423-5114",                  // ?꾪솕踰덊샇
          referenceDate: "2024-12-31",                  // 湲곗??쇱옄
          insttCode: "1168000000",                      // 湲곌?肄붾뱶
        }
      ],
      pageNo: 1,
      numOfRows: 10,
      totalCount: 15234
    }
  }
};

console.log("?뱥 ?덉긽 ?곗씠??援ъ“:");
console.log(JSON.stringify(SAMPLE_NO_PARKING_ZONE, null, 2));

// ?깆뿉???쒖슜???곗씠??留ㅽ븨
function mapNoParkingZone(apiData) {
  return {
    id: `${apiData.ctprvnNm}_${apiData.signguNm}_${apiData.prhibtAreaNm}`,
    name: apiData.prhibtAreaNm,
    type: apiData.prhibtSeNm,
    
    // ?꾩튂
    address: apiData.rdnmadr || apiData.lnmadr,
    location: {
      lat: parseFloat(apiData.latitude),
      lng: parseFloat(apiData.longitude),
    },
    
    // 湲덉? ?쒓컙
    restrictedDays: apiData.prhibtDayNm,
    restrictedHours: `${apiData.operBeginHhmm}~${apiData.operEndHhmm}`,
    startTime: apiData.operBeginHhmm,
    endTime: apiData.operEndHhmm,
    
    // 異붽??뺣낫
    reason: apiData.prhibtRsnCn,
    authority: apiData.institutionNm,
    phone: apiData.phoneNumber,
    lastUpdated: apiData.referenceDate,
  };
}

console.log("\n?벑 ?깆슜 留ㅽ븨 ?곗씠??");
console.log(JSON.stringify(
  mapNoParkingZone(SAMPLE_NO_PARKING_ZONE.response.body.items[0]), 
  null, 
  2
));

// ?꾪뿕??怨꾩궛 濡쒖쭅
function calculateDangerLevel(zone, currentTime) {
  // ?꾩옱 ?쒓컙??湲덉??쒓컙??몄? 泥댄겕
  const now = currentTime || new Date();
  const currentHour = now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0');
  
  const isRestricted = currentHour >= zone.startTime && currentHour <= zone.endTime;
  
  // ?붿씪 泥댄겕 (媛꾨떒 援ы쁽)
  const dayNames = ['??, '??, '??, '??, '紐?, '湲?, '??];
  const currentDay = dayNames[now.getDay()];
  const isDayRestricted = zone.restrictedDays?.includes(currentDay);
  
  return {
    isDangerous: isRestricted && isDayRestricted,
    level: (isRestricted && isDayRestricted) ? 'HIGH' : 'SAFE',
    message: (isRestricted && isDayRestricted) 
      ? `?좑툘 ?꾩옱 二쇱젙李?湲덉??쒓컙?낅땲??(${zone.restrictedHours})`
      : `???꾩옱 二쇱젙李?媛???쒓컙?낅땲??,
  };
}

const sampleZone = mapNoParkingZone(SAMPLE_NO_PARKING_ZONE.response.body.items[0]);
console.log("\n?슚 ?꾪뿕??遺꾩꽍:");
console.log(calculateDangerLevel(sampleZone));

module.exports = { mapNoParkingZone, calculateDangerLevel };
