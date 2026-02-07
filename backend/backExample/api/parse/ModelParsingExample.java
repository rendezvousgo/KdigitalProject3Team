package parse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.util.List;

// json + 모델

// --- DTO 모델 클래스 (모두 public으로 선언하여 접근 문제 원천 차단) ---

@JsonIgnoreProperties(ignoreUnknown = true)
class RootResponse {
    public String status;
    public DataContent data;
}

@JsonIgnoreProperties(ignoreUnknown = true)
class DataContent {
    public List<Announcement> announcements;
    public List<Category> categories;
}

@JsonIgnoreProperties(ignoreUnknown = true)
class Announcement {
    public String id;
    public String msg;
}

@JsonIgnoreProperties(ignoreUnknown = true)
class Category {
    public String name;
    public List<PostModel> postList;
}

@JsonIgnoreProperties(ignoreUnknown = true)
class PostModel {
    public int id;
    public String title;
    public List<String> tags; 
}

// --- 메인 실행 클래스 ---
public class ModelParsingExample {
    public static void main(String[] args) {
        ObjectMapper mapper = new ObjectMapper();

        try {
            // 파일 읽기
            RootResponse response = mapper.readValue(new File("json/data4.json"), RootResponse.class);

            if (response != null && "success".equals(response.status)) {
                System.out.println("상태: " + response.status);

                for (Category cat : response.data.categories) {
                    System.out.println("\n카테고리: " + cat.name);
                    
                    if (cat.postList != null) {
                        for (PostModel p : cat.postList) {
                            // public 필드이므로 직접 접근
                            System.out.println(" - 제목: " + p.title);
                            System.out.print("   태그: ");
                            if (p.tags != null) {
                                for (String tag : p.tags) {
                                    System.out.print("#" + tag + " ");
                                }
                            }
                            System.out.println();
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("에러 발생: " + e.getMessage());
            e.printStackTrace();
        }
    }
}