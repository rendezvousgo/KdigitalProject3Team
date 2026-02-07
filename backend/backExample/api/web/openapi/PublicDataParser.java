package web.openapi;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

// 공공데이터 OpenAPI (범죄율))

public class PublicDataParser {
        public static void main(String[] args) {
        // 1. 필수 설정 정보
        String serviceKey = "416bdc4ff6082e60a4dc88a9cee63aa7f41e88f10bd15d65da8f3799762cc3e0";
        // String baseUrl = "https://api.odcloud.kr/api/3074462/v1/uddi:efafd73f-3310-48f8-9f56-bddc1c51f3ba_201910221541";
        String baseUrl = "https://api.odcloud.kr/api/3074462/v1/uddi:ae109087-8690-4cb5-bda9-a7876a92f3b8?page=1&perPage=10&serviceKey=416bdc4ff6082e60a4dc88a9cee63aa7f41e88f10bd15d65da8f3799762cc3e0";

        try {
            // 2. 파라미터 조립
            StringBuilder urlBuilder = new StringBuilder(baseUrl);
            // urlBuilder.append("?page=" + URLEncoder.encode("1", "UTF-8"));
            // urlBuilder.append("&perPage=" + URLEncoder.encode("10", "UTF-8"));
            // urlBuilder.append("&returnType=" + URLEncoder.encode("JSON", "UTF-8"));
            // urlBuilder.append("&serviceKey=" + serviceKey);

            // 3. 연결 설정
            URL url = new URL(urlBuilder.toString());
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Content-type", "application/json");

            System.out.println("=== 꽃가루농도지수 조회서비스 ===");
            System.out.println("요청 URL: " + urlBuilder.toString());
            System.out.println("응답 코공공데이터 API 조회()");
            System.out.println("------------------------------------");

            // 4. 데이터 읽기
            BufferedReader rd;
            if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
                rd = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
            } else {
                rd = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));
            }

            // 5. 응답 데이터 출력
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            
            String result = sb.toString();
            System.out.println("응답 데이터:");
            System.out.println(result);

            rd.close();
            conn.disconnect();

        } catch (Exception e) {
            System.err.println("오류 발생: " + e.getMessage());
            e.printStackTrace();
        }
    }
}