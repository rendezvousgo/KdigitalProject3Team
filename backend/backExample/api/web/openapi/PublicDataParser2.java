package web.openapi;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// 공공데이터 OpenAPI (범죄율2) - MAP사용


public class PublicDataParser2 {
    public static void main(String[] args) {
        String serviceKey = "416bdc4ff6082e60a4dc88a9cee63aa7f41e88f10bd15d65da8f3799762cc3e0";
        String apiUrl = "https://api.odcloud.kr/api/3074462/v1/uddi:efafd73f-3310-48f8-9f56-bddc1c51f3ba_201910221541?page=1&perPage=10&returnType=JSON&serviceKey=" + serviceKey;

        try {
            // 1. API 연결
            URL url = new URL(apiUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            BufferedReader rd = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));

            // 2. JSON 파싱
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> response = mapper.readValue(rd, new TypeReference<Map<String, Object>>() {});
            
            // 3. 데이터 처리
            List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
            System.out.println("총 " + response.get("currentCount") + "건\n");
            
            for (Map<String, Object> item : dataList) {
                String category = item.get("범죄대분류") + " - " + item.get("범죄중분류");
                System.out.println("[" + category + "]");
                
                List<Content> contents = new ArrayList<>();
                for (String key : item.keySet()) {
                    if (!key.equals("범죄대분류") && !key.equals("범죄중분류")) {
                        Content content = new Content(key, String.valueOf(item.get(key)));
                        contents.add(content);
                    }
                }
                
                for (Content content : contents) {
                    System.out.println("  " + content.location + ": " + content.cnt + "건");
                }
                System.out.println();
            }

            rd.close();
            conn.disconnect();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}