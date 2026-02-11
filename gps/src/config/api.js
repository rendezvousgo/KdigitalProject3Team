// ADB reverse 포워딩 사용: adb reverse tcp:8080 tcp:8080
// 이렇게 하면 에뮬레이터/핸드폰 모두 localhost:8080으로 PC 백엔드에 접근 가능
// (핸드폰은 USB 연결 + adb reverse 필요)
export const API_BASE_URL = 'http://localhost:8080';
