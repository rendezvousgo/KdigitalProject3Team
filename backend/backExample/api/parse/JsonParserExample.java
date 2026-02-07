package parse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// 모델로 읽어오기

// JSON에 클래스에 없는 필드가 있어도 에러를 방지하는 설정
@JsonIgnoreProperties(ignoreUnknown = true)
class Post {
    private Long id;
    private String title;
    private String content;
    private String author;

    // 기본 생성자 필수
    public Post() {}

    // Getter & Setter
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getAuthor() { return author; }
    
    @Override
    public String toString() {
        return "Post{id=" + id + ", title='" + title + "', author='" + author + "'}";
    }
}

public class JsonParserExample {
    public static void main(String[] args) {
        // 1. 가상의 JSON 게시글 데이터
        String jsonInput = "{\"id\": 101, \"title\": \"자바 공부법\", \"content\": \"열심히 하면 됩니다!\", \"author\": \"제미나이\"}";

        // 2. ObjectMapper 객체 생성
        ObjectMapper objectMapper = new ObjectMapper();

        try {
            // 3. JSON 문자열을 Post 객체로 변환 (파싱)
            Post post = objectMapper.readValue(jsonInput, Post.class);

            // 4. 결과 출력
            System.out.println("--- 파싱 성공 ---");
            System.out.println("제목: " + post.getTitle());
            System.out.println("작성자: " + post.getAuthor());
            System.out.println("전체 데이터: " + post);

        } catch (Exception e) {
            System.err.println("파싱 중 오류 발생: " + e.getMessage());
        }
    }
}