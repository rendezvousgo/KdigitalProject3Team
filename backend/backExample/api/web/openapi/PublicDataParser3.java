package web.openapi;

import com.fasterxml.jackson.databind.ObjectMapper;

import web.openapi.WeatherApiResponse;
import web.openapi.WeatherItem;
import web.openapi.WeatherResponse;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;


// 공공데이터 OpenAPI (날씨 사용)

public class PublicDataParser3 {
    public static void main(String[] args) {
        String serviceKey = "416bdc4ff6082e60a4dc88a9cee63aa7f41e88f10bd15d65da8f3799762cc3e0";
        String apiUrl = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?pageNo=1&numOfRows=100&dataType=json&base_date=20260124&base_time=0600&nx=55&ny=127&serviceKey=" + serviceKey;

        try {
            // 1. API 연결
            URL url = new URL(apiUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));

            // 2. JSON 파싱
            ObjectMapper mapper = new ObjectMapper();
            WeatherApiResponse apiResponse = mapper.readValue(rd, WeatherApiResponse.class);
            
            // 3. 데이터 출력
            WeatherResponse response = apiResponse.response;
            System.out.println("=== 기상청 초단기실황 조회 ===");
            System.out.println("응답코드: " + response.header.resultCode);
            System.out.println("응답메시지: " + response.header.resultMsg);
            System.out.println("총 " + response.body.totalCount + "건\n");
            
            for (WeatherItem item : response.body.items.item) {
                System.out.println("[" + item.category + "] " + item.obsrValue);
                System.out.println("  날짜: " + item.baseDate + " 시간: " + item.baseTime);
                System.out.println("  좌표: (" + item.nx + ", " + item.ny + ")\n");
            }

            rd.close();
            conn.disconnect();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}