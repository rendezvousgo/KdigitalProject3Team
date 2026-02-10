import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // 아이콘 추가
import { View, Platform, Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';
// 게시판 스크린이 아직 없다면 임시로 View를 연결합니다.
const CommunityScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>게시판 준비 중</Text></View>;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs({ route, navigation }) {
  React.useEffect(() => {
    if (route?.params?.destination && route?.params?.timestamp) {
      navigation.navigate('HomeTab', {
        destination: route.params.destination,
        timestamp: route.params.timestamp,
      });
    }
  }, [route?.params?.destination, route?.params?.timestamp]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'map' : 'map-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'CommunityTab') {
            // 게시판은 말풍선이나 리스트 아이콘
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'AITab') {
            // ★☆ 중앙 AI 버튼 특별 디자인 ★☆
            return (
              <View style={{
                backgroundColor: '#FFD700', // 요청하신 노란색 계열 (Gold)
                width: 54,
                height: 54,
                borderRadius: 27,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'ios' ? 25 : 30, // 살짝 위로 띄움
                borderWidth: 4,
                borderColor: '#fff', // 흰색 테두리로 분리감
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 10,
              }}>
                <MaterialCommunityIcons name="robot" size={28} color="#007AFF" /> 
                {/* 노란 바닥에 파란 AI 로봇 아이콘 */}
              </View>
            );
          }
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 75,
          paddingTop: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 0, // 선을 없애고 그림자를 줍니다
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 10,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ tabBarLabel: '지도' }}
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchScreen}
        options={{ tabBarLabel: '검색' }}
      />
      {/* ★☆ AI 탭을 정중앙에 배치 ★☆ */}
      <Tab.Screen 
        name="AITab" 
        component={AIAssistantScreen}
        options={{ tabBarLabel: '' }} // AI는 버튼이 커서 라벨을 빼는 게 예쁩니다
      />
      <Tab.Screen 
        name="CommunityTab" 
        component={CommunityScreen}
        options={{ tabBarLabel: '게시판' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ tabBarLabel: '마이' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="AIAssistant" 
          component={AIAssistantScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}