package parse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;

public class AdvancedArrayParser {

    //json으로 읽어오기 어려움
    public static void main(String[] args) {
        ObjectMapper mapper = new ObjectMapper();

        try {
            // 1. 파일 읽기
            JsonNode root = mapper.readTree(new File("json/data4.json"));

            // 2. 단순 필드 체크
            if ("success".equals(root.get("status").asText())) {
                JsonNode data = root.get("data");

                // 3. 공지사항(announcements) 배열 순회
                System.out.println("=== 공지사항 ===");
                for (JsonNode announce : data.get("announcements")) {
                    System.out.println("- " + announce.get("msg").asText());
                }

                // 4. 카테고리(categories) 내의 포스트 리스트(postList) 이중 순회
                System.out.println("\n=== 카테고리별 게시글 ===");
                JsonNode categories = data.get("categories");
                
                for (JsonNode category : categories) {
                    String catName = category.get("name").asText();
                    System.out.println("[" + catName + "]");

                    JsonNode postList = category.get("postList");
                    if (postList.isEmpty()) {
                        System.out.println("  (게시글이 없습니다)");
                    } else {
                        for (JsonNode post : postList) {
                            System.out.println("  ID: " + post.get("id").asInt() + " / 제목: " + post.get("title").asText());
                            
                            // tags 배열도 가져오기
                            System.out.print("  태그: ");
                            for (JsonNode tag : post.get("tags")) {
                                System.out.print("#" + tag.asText() + " ");
                            }
                            System.out.println();
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}