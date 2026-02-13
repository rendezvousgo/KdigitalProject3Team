// 핸드폰에서 QR코드로 실행 시: PC의 Wi-Fi IP로 접근해야 함
// PC와 핸드폰이 같은 Wi-Fi에 연결되어 있어야 합니다
// USB 디버깅 시에는 'http://localhost:8080' 사용 (adb reverse tcp:8080 tcp:8080)
export const API_BASE_URL = 'http://192.168.1.83:8080';
