package web.openapi;
import java.util.List;

public class WeatherApiResponse {
    public WeatherResponse response;
}

class WeatherResponse {
    public WeatherHeader header;
    public WeatherBody body;
}

class WeatherHeader {
    public String resultCode;
    public String resultMsg;
}

class WeatherBody {
    public String dataType;
    public WeatherItems items;
    public int pageNo;
    public int numOfRows;
    public int totalCount;
}

class WeatherItems {
    public List<WeatherItem> item;
}

class WeatherItem {
    public String baseDate;
    public String baseTime;
    public String category;
    public int nx;
    public int ny;
    public String obsrValue;
}

/*
{
  "response": { // 최상위 루트 객체
    "header": { // 응답 결과의 상태를 나타내는 상자
       "resultCode": "00",           // 결과 코드 (00: 정상, 그 외는 에러)
       "resultMsg": "NORMAL_SERVICE" // 결과 메시지 (정상 서비스 등)
    },
    "body": { // 실제 날씨 데이터가 담긴 메인 상자
       "dataType": "JSON", // 응답 데이터 형식 (JSON 또는 XML)
       "items": { // 데이터 목록을 감싸는 상자
          "item": [ // 실제 날씨 정보 객체들이 담긴 리스트 (Array)
             {
                "baseDate": "20260123", // 발표 일자 (YYYYMMDD)
                "baseTime": "0600",     // 발표 시각 (HHMM)
                "category": "PTY",      // 기상 요소 키워드 (예: PTY=강수형태, T1H=기온)
                "nx": 55,               // 예보지점 X 좌표
                "ny": 127,              // 예보지점 Y 좌표
                "obsrValue": "0"        // 실제 측정값 (가장 중요한 데이터!)
             },
             {
                "baseDate": "20260123",
                "baseTime": "0600",
                "category": "REH",      // REH: 습도 (%)
                "nx": 55,
                "ny": 127,
                "obsrValue": "79"
             },
             {
                "baseDate": "20260123",
                "baseTime": "0600",
                "category": "T1H",      // T1H: 기온 (섭씨 ℃)
                "nx": 55,
                "ny": 127,
                "obsrValue": "-14.4"    // 현재 기온 -14.4도 (매우 춥네요!)
             }
          ]
       },
       "pageNo": 1,        // 현재 페이지 번호
       "numOfRows": 100,   // 한 페이지에 보여줄 데이터 개수
       "totalCount": 8     // 전체 데이터 개수
    }
  }
}

*/