import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs({ route, navigation }) {
  // Stack에서 전달된 params를 Tab 내부 HomeScreen에 전달
  React.useEffect(() => {
    if (route?.params?.destination && route?.params?.timestamp) {
      // HomeTab으로 직접 navigate하여 params 전달
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
          if (route.name === 'HomeTab') {
            return <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />;
          } else if (route.name === 'SearchTab') {
            return <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />;
          } else if (route.name === 'AITab') {
            return (
              <View style={{
                backgroundColor: focused ? '#5856D6' : '#E8E7FF',
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'ios' ? 20 : 0,
                shadowColor: '#5856D6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: focused ? 0.4 : 0,
                shadowRadius: 8,
                elevation: focused ? 8 : 0,
              }}>
                <Ionicons name="sparkles" size={24} color={focused ? '#fff' : '#5856D6'} />
              </View>
            );
          } else if (route.name === 'ProfileTab') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
          }
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 82,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 22,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
      <Tab.Screen 
        name="AITab" 
        component={AIAssistantScreen}
        options={{ tabBarLabel: 'AI 추천' }}
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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="AIAssistant" 
          component={AIAssistantScreen}
          options={{
            presentation: 'card',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
