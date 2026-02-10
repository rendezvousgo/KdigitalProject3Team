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
import CommunityScreen from '../screens/CommunityScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import PostWriteScreen from '../screens/PostWriteScreen';

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
       tabBarStyle: {
          // 전체 높이를 85로 유지하면서 내부 여백을 조정합니다.
          height: Platform.OS === 'ios' ? 90 : 95, 
          // 상단 여백을 줄여서 아이콘을 살짝 위로 올립니다.
          paddingTop: 5, 
          // 하단 패딩을 줄여야 글자가 위로 올라와서 보입니다! (15 -> 5)
          paddingBottom: Platform.OS === 'ios' ? 30 : 25, 
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11, // 글씨 크기를 11로 살짝 키우면 더 잘 보여요.
          fontWeight: '700', // 좀 더 두껍게 해서 가독성 확보!
          // 하단 마진을 10 정도로 주어 바닥에서 살짝 띄웁니다.
          marginBottom: Platform.OS === 'ios' ? 0 : 14, 
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
        options={{ tabBarLabel: '마이페이지' }}
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
        <Stack.Screen 
          name="PostDetail" 
          component={PostDetailScreen}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="PostWrite" 
          component={PostWriteScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}