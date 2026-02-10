import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" // 상단 바 배경 흰색
        translucent={false}      // ★ 중요: 콘텐츠가 상단 바 위로 침범하지 않게 설정
      />
      <AppNavigator />
    </>
  );
}
