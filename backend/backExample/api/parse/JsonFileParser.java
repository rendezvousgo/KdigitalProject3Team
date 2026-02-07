package parse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;

// json으로 읽어오기

public class JsonFileParser {
    public static void main(String[] args) {
        ObjectMapper mapper = new ObjectMapper();

        try {
            // 1. 파일 객체 생성 (경로 주의: 프로젝트 루트 기준)
            File jsonFile = new File("json/data.json");

            // 2. 파일을 읽어 JsonNode로 변환
            // readValue(파일, 클래스) 또는 readTree(파일) 사용 가능
            JsonNode root = mapper.readTree(jsonFile);

            // 3. 데이터 추출
            String title = root.get("title").asText();
            int views = root.get("stats").get("views").asInt(); // 중첩 구조 접근

            Post post = mapper.readValue(new File("json/data.json"), Post.class);
            System.out.println(post);
            
            // 4. 배열 데이터 반복문 처리
            System.out.println("제목: " + title);
            System.out.println("조회수: " + views);
            System.out.print("태그: ");
            for (JsonNode tag : root.get("tags")) {
                System.out.print("#" + tag.asText() + " ");
            }

        } catch (IOException e) {
            System.err.println("파일을 읽는 중 오류가 발생했습니다: " + e.getMessage());
            // 파일 경로가 틀렸을 때 주로 발생합니다.
        }
    }
}