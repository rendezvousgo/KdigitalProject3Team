export default {
  name: 'SafeParking',
  slug: 'safe-parking',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#007AFF'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.triceratops.safeparking',
    config: {
      googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#007AFF'
    },
    package: 'com.triceratops.safeparking',
    config: {
      googleMaps: {
        apiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
      }
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION'
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
        },
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'SafeParking이 주변 주차장과 단속카메라 정보를 제공하기 위해 위치 정보가 필요합니다.'
      }
    ]
  ],
  extra: {
    kakaoMapApiKey: 'YOUR_KAKAO_MAP_API_KEY',
    publicDataApiKey: 'YOUR_PUBLIC_DATA_API_KEY'
  }
};
