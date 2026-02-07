package web.ice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

// 1. 최상위 루트 객체
@JsonIgnoreProperties(ignoreUnknown = true)
class CoursePageResponse {
    public List<Course> content; // 강의 목록
    public int totalPages;       // 전체 페이지 수
    public long totalElements;   // 전체 데이터 개수
    public boolean last;         // 마지막 페이지 여부
    public int size;             // 한 페이지당 데이터 개수
    
    @Override
    public String toString() {
        return "CoursePageResponse [content=" + content + ", totalPages=" + totalPages + ", totalElements="
                + totalElements + ", last=" + last + ", size=" + size + "]";
    }
}

// 2. 개별 강의 정보 객체
@JsonIgnoreProperties(ignoreUnknown = true)
class Course {
    public String uid;
    public String name;          // 과정명
    public String teacherName;   // 강사명
    public int maxPeople;        // 정원
    public int currentPeople;    // 현재 신청 인원
    public int localPrice;       // 수강료(지역)
    public String classStart;    // 개강일
    public String classEnd;      // 종강일
    public List<Integer> classDay; // 수업 요일 (1:월, 2:화...)
    
    @Override
    public String toString() {
        return "Course [uid=" + uid + ", name=" + name + ", teacherName=" + teacherName + ", maxPeople=" + maxPeople
                + ", currentPeople=" + currentPeople + ", localPrice=" + localPrice + ", classStart=" + classStart
                + ", classEnd=" + classEnd + ", classDay=" + classDay + "]";
    }
}