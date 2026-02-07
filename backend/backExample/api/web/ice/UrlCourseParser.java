package web.ice;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URL; // URL 클래스 추가

public class UrlCourseParser {
    public static void main(String[] args) {
        ObjectMapper mapper = new ObjectMapper();

        try {
            // 1. 접속할 API 주소 설정
            String urlPath = "https://ice.cs.ac.kr/api/lecture-item?page=0&size=10&ordered=dueAsc&categoryUid=1";
            URL url = new URL(urlPath);

            System.out.println("데이터를 가져오는 중: " + urlPath);
            System.out.println("------------------------------------");

            // 2. mapper.readValue의 첫 번째 인자를 URL 객체로 변경
            // Jackson이 내부적으로 HTTP 연결을 맺고 데이터를 읽어옵니다.
            CoursePageResponse response = mapper.readValue(url, CoursePageResponse.class);

            if (response != null && response.content != null) {
                System.out.println("=== 실시간 교육 과정 현황 ===");
                System.out.println("총 데이터 수: " + response.totalElements);
                System.out.println("현재 페이지 데이터: " + response.content.size() + "건");
                System.out.println("------------------------------------");

                for (Course c : response.content) {
                    // 기본 정보 출력
                    System.out.print("[" + c.uid + "] " + c.name);
                    System.out.println(" (강사: " + (c.teacherName == null ? "미지정" : c.teacherName) + ")");

                    // 모집 현황 계산
                    double fillRate = (double) c.currentPeople / c.maxPeople * 100;
                    System.out.println("   모집상태: " + c.currentPeople + "/" + c.maxPeople + " (" + (int)fillRate + "%)");

                    if (fillRate >= 80) {
                        System.out.println("   ⭐ 마감 임박! 서두르세요!");
                    }

                    // 수강료 정보
                    System.out.println("   수강료: " + String.format("%,d", c.localPrice) + "원");
                    System.out.println("------------------------------------");
                }
            } else {
                System.out.println("데이터가 비어 있습니다.");
            }

        } catch (java.net.UnknownHostException e) {
            System.err.println("인터넷 연결을 확인해주세요 (서버 주소 오류).");
        } catch (java.io.IOException e) {
            System.err.println("데이터 읽기 실패: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}