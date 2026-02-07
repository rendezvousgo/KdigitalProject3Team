package web.ice;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;

public class CourseParser {
    public static void main(String[] args) {


        //ice.cs.ac.kr.json으로 파싱
        //jsonDto.java

        ObjectMapper mapper = new ObjectMapper();

        try {
            // JSON 파일 읽기
            CoursePageResponse response = mapper.readValue(new File("json/ice.cs.ac.kr.json"), CoursePageResponse.class);

            System.out.println("=== 전체 교육 과정 현황 ===");
            System.out.println("총 데이터 수: " + response.totalElements);
            System.out.println("현재 페이지 데이터: " + response.content.size() + "건");
            System.out.println("------------------------------------");

            System.out.println(response);

            for (Course c : response.content) {
                // 1. 기본 정보 출력
                System.out.print("[" + c.uid + "] " + c.name);
                System.out.println(" (강사: " + (c.teacherName == null ? "미지정" : c.teacherName) + ")");

                // 2. 모집 현황 계산 (인기 강의 로직)
                double fillRate = (double) c.currentPeople / c.maxPeople * 100;
                System.out.println("   모집상태: " + c.currentPeople + "/" + c.maxPeople + " (" + (int)fillRate + "%)");

                if (fillRate >= 80) {
                    System.out.println("   ⭐ 마감 임박! 서두르세요!");
                }

                // 3. 수강료 정보
                System.out.println("   수강료: " + String.format("%,d", c.localPrice) + "원");
                System.out.println("------------------------------------");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}