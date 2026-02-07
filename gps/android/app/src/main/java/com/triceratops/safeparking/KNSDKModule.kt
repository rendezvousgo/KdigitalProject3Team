package com.triceratops.safeparking

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.kakaomobility.knsdk.KNLanguageType
import java.security.MessageDigest

class KNSDKModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "KNSDKModule"
        const val TAG = "KNSDKModule"
        // 카카오디벨로퍼스에서 발급받은 네이티브 앱 키
        // ⚠️ 키를 변경하려면 이 값을 본인의 Native App Key로 교체하세요
        const val KAKAO_NATIVE_APP_KEY = "dddfdc16fa2617b16c4ee0125f816293"
        var isInitialized = false
        var lastError: String? = null
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun initialize(promise: Promise) {
        Log.d(TAG, "KNSDK 인증 시작... (메인 스레드로 전환)")
        // 반드시 메인 스레드에서 실행 (RN bridge는 별도 스레드)
        Handler(Looper.getMainLooper()).post {
            try {
                Log.d(TAG, "initializeWithAppKey 호출 (메인 스레드)")
                // 시그니처: initializeWithAppKey(appKey, clientVersion, userKey, ???, langType, callback)
                // 튜토리얼: aAppKey, aClientVersion, aUserKey, (default), aLangType, aCompletion
                MainApplication.knsdk.initializeWithAppKey(
                    KAKAO_NATIVE_APP_KEY,                           // aAppKey
                    "1.0.0",                                         // aClientVersion
                    "safeparking_user",                              // aUserKey (튜토리얼: "testUser")
                    "",                                              // 4번째 파라미터 (기본값)
                    KNLanguageType.KNLanguageType_KOREAN,            // aLangType
                ) { error ->
                    if (error != null) {
                        val errMsg = "인증 실패 [${error.code}]: ${error.msg}"
                        Log.e(TAG, "KNSDK $errMsg")
                        lastError = errMsg
                        promise.reject("AUTH_ERROR", errMsg)
                    } else {
                        Log.d(TAG, "KNSDK 인증 성공!")
                        isInitialized = true
                        lastError = null
                        promise.resolve("KNSDK 인증 성공")
                    }
                }
            } catch (e: Exception) {
                val errMsg = "KNSDK 초기화 예외: ${e.message}"
                Log.e(TAG, errMsg, e)
                lastError = errMsg
                promise.reject("INIT_EXCEPTION", errMsg)
            }
        }
    }

    @ReactMethod
    fun startNavi(destLat: Double, destLng: Double, destName: String, startLat: Double, startLng: Double, promise: Promise) {
        try {
            if (!isInitialized) {
                Log.w(TAG, "KNSDK 미초기화 상태에서 startNavi 호출됨")
                promise.reject("NOT_INITIALIZED", "KNSDK가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.")
                return
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity를 찾을 수 없습니다.")
                return
            }

            // SDK 내장 WGS84 → KATEC 좌표 변환 (목적지)
            val destKatec = MainApplication.knsdk.convertWGS84ToKATEC(destLng, destLat)
            val destKatecX = destKatec.x.toInt()
            val destKatecY = destKatec.y.toInt()
            Log.d(TAG, "목적지 좌표 변환: WGS84($destLat, $destLng) → KATEC($destKatecX, $destKatecY)")

            // 출발지 좌표 변환 (GPS 위치 → KATEC)
            var startKatecX = 0
            var startKatecY = 0
            if (startLat != 0.0 && startLng != 0.0) {
                val startKatec = MainApplication.knsdk.convertWGS84ToKATEC(startLng, startLat)
                startKatecX = startKatec.x.toInt()
                startKatecY = startKatec.y.toInt()
                Log.d(TAG, "출발지 좌표 변환: WGS84($startLat, $startLng) → KATEC($startKatecX, $startKatecY)")
            }

            val intent = Intent(activity, KNNaviActivity::class.java)
            intent.putExtra("dest_name", destName)
            intent.putExtra("dest_lng", destKatecX)
            intent.putExtra("dest_lat", destKatecY)
            intent.putExtra("start_lng", startKatecX)
            intent.putExtra("start_lat", startKatecY)
            activity.startActivity(intent)
            promise.resolve("내비게이션 시작")
        } catch (e: Exception) {
            Log.e(TAG, "내비게이션 시작 실패", e)
            promise.reject("NAVI_ERROR", "내비게이션 시작 실패: ${e.message}")
        }
    }

    @ReactMethod
    fun isReady(promise: Promise) {
        promise.resolve(isInitialized)
    }

    @ReactMethod
    fun getInitStatus(promise: Promise) {
        val result = Arguments.createMap()
        result.putBoolean("initialized", isInitialized)
        result.putString("error", lastError)
        promise.resolve(result)
    }

    /**
     * 앱의 실제 서명 키 해시를 런타임에서 구합니다.
     * 카카오 디벨로퍼스에 등록된 키 해시와 비교하여 불일치를 디버깅합니다.
     */
    @ReactMethod
    fun getKeyHash(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageName = context.packageName
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val packageInfo = context.packageManager.getPackageInfo(
                    packageName, PackageManager.GET_SIGNING_CERTIFICATES
                )
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                val packageInfo = context.packageManager.getPackageInfo(
                    packageName, PackageManager.GET_SIGNATURES
                )
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            if (signatures == null || signatures.isEmpty()) {
                promise.reject("NO_SIGNATURES", "서명 정보를 찾을 수 없습니다")
                return
            }

            val result = Arguments.createMap()
            result.putString("packageName", packageName)

            val keyHashes = Arguments.createArray()
            for (signature in signatures) {
                val md = MessageDigest.getInstance("SHA")
                md.update(signature.toByteArray())
                val keyHash = Base64.encodeToString(md.digest(), Base64.NO_WRAP)
                keyHashes.pushString(keyHash)
                Log.d(TAG, "런타임 키 해시: $keyHash (패키지: $packageName)")
            }
            result.putArray("keyHashes", keyHashes)
            result.putString("registeredHash", "Zd7qsmuC318N2OBYBvnXUr6TLQc=")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "키 해시 조회 실패", e)
            promise.reject("KEY_HASH_ERROR", "키 해시 조회 실패: ${e.message}")
        }
    }
}
