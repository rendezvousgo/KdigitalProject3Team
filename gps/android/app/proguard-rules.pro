# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# KNSDK (카카오모빌리티 내비 SDK)
-keep class com.kakaomobility.** { *; }
-keep class com.kakao.** { *; }

# SafeParking custom native modules
-keep class com.triceratops.safeparking.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-voice
-keep class com.wenkesj.voice.** { *; }

# react-native-webview
-keep class com.reactnativecommunity.webview.** { *; }

# Add any project specific keep options here:
