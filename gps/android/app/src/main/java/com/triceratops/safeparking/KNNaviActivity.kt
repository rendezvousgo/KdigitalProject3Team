package com.triceratops.safeparking

import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.kakaomobility.knsdk.KNRoutePriority
import com.kakaomobility.knsdk.common.objects.KNError
import com.kakaomobility.knsdk.common.objects.KNPOI
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_CitsGuideDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_GuideStateDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_LocationGuideDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_RouteGuideDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_SafetyGuideDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuidance_VoiceGuideDelegate
import com.kakaomobility.knsdk.guidance.knguidance.KNGuideRouteChangeReason
import com.kakaomobility.knsdk.guidance.knguidance.citsguide.KNGuide_Cits
import com.kakaomobility.knsdk.guidance.knguidance.locationguide.KNGuide_Location
import com.kakaomobility.knsdk.guidance.knguidance.routeguide.KNGuide_Route
import com.kakaomobility.knsdk.guidance.knguidance.routeguide.objects.KNMultiRouteInfo
import com.kakaomobility.knsdk.guidance.knguidance.safetyguide.KNGuide_Safety
import com.kakaomobility.knsdk.guidance.knguidance.safetyguide.objects.KNSafety
import com.kakaomobility.knsdk.guidance.knguidance.voiceguide.KNGuide_Voice
import com.kakaomobility.knsdk.trip.kntrip.KNTrip
import com.kakaomobility.knsdk.trip.kntrip.knroute.KNRoute
import com.kakaomobility.knsdk.guidance.knguidance.common.KNLocation
import com.kakaomobility.knsdk.ui.view.KNNaviView

class KNNaviActivity : AppCompatActivity(),
    KNGuidance_GuideStateDelegate,
    KNGuidance_LocationGuideDelegate,
    KNGuidance_RouteGuideDelegate,
    KNGuidance_SafetyGuideDelegate,
    KNGuidance_VoiceGuideDelegate,
    KNGuidance_CitsGuideDelegate {

    lateinit var naviView: KNNaviView

    companion object {
        const val TAG = "KNNaviActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_kn_navi)

        naviView = findViewById(R.id.navi_view)

        // status bar 영역까지 사용하기 위한 옵션 (튜토리얼 Step 08-3)
        window?.apply {
            statusBarColor = Color.TRANSPARENT
            decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        }

        Log.d(TAG, "KNNaviActivity 시작")
        // 경로 요청 (튜토리얼 Step 08-2)
        requestRoute()
    }

    /**
     * 주행 경로를 요청합니다. (튜토리얼 Step 08-2)
     */
    override fun onDestroy() {
        super.onDestroy()
        // ★ 이전 경로 잔존 방지: guidance 중지
        try {
            MainApplication.knsdk.sharedGuidance()?.stop()
            Log.d(TAG, "Guidance 정리 완료")
        } catch (e: Exception) {
            Log.e(TAG, "Guidance 정리 오류: ${e.message}")
        }
    }

    fun requestRoute() {
        // ★ 기존 경로/guidance 완전 정리 (이전 경로 잔존 방지)
        try {
            MainApplication.knsdk.sharedGuidance()?.stop()
            Log.d(TAG, "기존 Guidance 정리 완료")
        } catch (e: Exception) {
            Log.w(TAG, "기존 Guidance 정리 중 오류 (무시): ${e.message}")
        }

        val destName = intent.getStringExtra("dest_name") ?: "목적지"
        val destLng = intent.getIntExtra("dest_lng", 0)
        val destLat = intent.getIntExtra("dest_lat", 0)
        val startLng = intent.getIntExtra("start_lng", 0)
        val startLat = intent.getIntExtra("start_lat", 0)

        // ★ 경유지 파싱
        val waypointsJson = intent.getStringExtra("waypoints_json")
        var vias: MutableList<KNPOI>? = null
        if (!waypointsJson.isNullOrEmpty()) {
            try {
                val jsonArray = org.json.JSONArray(waypointsJson)
                val viaList = mutableListOf<KNPOI>()
                for (i in 0 until jsonArray.length()) {
                    val wp = jsonArray.getJSONObject(i)
                    val wpLat = wp.getDouble("lat")
                    val wpLng = wp.getDouble("lng")
                    val wpName = wp.optString("name", "경유지${i + 1}")
                    val wpKatec = MainApplication.knsdk.convertWGS84ToKATEC(wpLng, wpLat)
                    viaList.add(KNPOI(wpName, wpKatec.x.toInt(), wpKatec.y.toInt(), wpName))
                    Log.d(TAG, "경유지 $i: $wpName WGS84($wpLat,$wpLng) \u2192 KATEC(${wpKatec.x.toInt()},${wpKatec.y.toInt()})")
                }
                vias = viaList
                Log.d(TAG, "경유지 ${viaList.size}곳 설정 완료")
            } catch (e: Exception) {
                Log.e(TAG, "경유지 파싱 오류: ${e.message}")
            }
        }

        Log.d(TAG, "경로 요청: start=($startLng,$startLat) \u2192 dest=$destName($destLng,$destLat), 경유지=${vias?.size ?: 0}곳")

        Thread {
            // 출발지: GPS 좌표가 있으면 사용, 없으면 (0,0)=현재위치
            val startPoi = KNPOI("현위치", startLng, startLat, "현위치")
            val goalPoi = KNPOI(destName, destLng, destLat, destName)

            Log.d(TAG, "makeTripWithStart 호출...")
            MainApplication.knsdk.makeTripWithStart(
                aStart = startPoi,
                aGoal = goalPoi,
                aVias = vias
            ) { aError, aTrip ->
                if (aError != null) {
                    Log.e(TAG, "경로 요청 실패: code=${aError.code}, msg=${aError.msg}")
                    runOnUiThread {
                        Toast.makeText(this@KNNaviActivity, "경로 요청 실패: ${aError.msg}", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    Log.d(TAG, "경로 요청 성공! startGuide 호출")
                    // 경로 요청 성공 시 주행 시작 (튜토리얼 Step 08-3)
                    startGuide(aTrip)
                }
            }
        }.start()
    }

    /**
     * 주행을 구성합니다. (튜토리얼 Step 08-3)
     */
    fun startGuide(trip: KNTrip?) {
        MainApplication.knsdk.sharedGuidance()?.apply {
            // guidance delegate 등록 (튜토리얼 Step 08-4)
            guideStateDelegate = this@KNNaviActivity
            locationGuideDelegate = this@KNNaviActivity
            routeGuideDelegate = this@KNNaviActivity
            safetyGuideDelegate = this@KNNaviActivity
            voiceGuideDelegate = this@KNNaviActivity
            citsGuideDelegate = this@KNNaviActivity

            runOnUiThread {
                naviView.initWithGuidance(
                    this,
                    trip,
                    KNRoutePriority.KNRoutePriority_Recommand,
                    0
                )
            }
        }
    }

    // KNGuidance_GuideStateDelegate

    // 길 안내 시작 시 호출
    override fun guidanceGuideStarted(guidance: KNGuidance) {
        naviView.guidanceGuideStarted(guidance)
    }

    // 경로 변경 시 호출
    override fun guidanceCheckingRouteChange(guidance: KNGuidance) {
        naviView.guidanceCheckingRouteChange(guidance)
    }

    // 수신 받은 새 경로가 기존의 안내된 경로와 동일할 경우 호출
    override fun guidanceRouteUnchanged(guidance: KNGuidance) {
        naviView.guidanceRouteUnchanged(guidance)
    }

    // 경로에 오류가 발생 시 호출
    override fun guidanceRouteUnchangedWithError(guidnace: KNGuidance, error: KNError) {
        naviView.guidanceRouteUnchangedWithError(guidnace, error)
    }

    // 경로에서 이탈한 뒤 새로운 경로를 요청할 때 호출
    override fun guidanceOutOfRoute(guidance: KNGuidance) {
        naviView.guidanceOutOfRoute(guidance)
    }

    // 수신 받은 새 경로가 기존의 안내된 경로와 다를 경우 호출
    override fun guidanceRouteChanged(aGuidance: KNGuidance, aFromRoute: KNRoute, aFromLocation: KNLocation, aToRoute: KNRoute, aToLocation: KNLocation, aChangeReason: KNGuideRouteChangeReason) {
        naviView.guidanceRouteChanged(aGuidance)
    }

    // 길 안내 종료 시 호출
    override fun guidanceGuideEnded(guidance: KNGuidance) {
        naviView.guidanceGuideEnded(guidance)
        finish()
    }

    // 주행 중 기타 요인들로 인해 경로가 변경되었을 때 호출
    override fun guidanceDidUpdateRoutes(guidance: KNGuidance, routes: List<KNRoute>, multiRouteInfo: KNMultiRouteInfo?) {
        naviView.guidanceDidUpdateRoutes(guidance, routes, multiRouteInfo)
    }

    // 실내 경로 업데이트 시 호출
    override fun guidanceDidUpdateIndoorRoute(aGuidance: KNGuidance, aRoute: KNRoute?) {
        if (aRoute != null) {
            naviView.guidanceDidUpdateIndoorRoute(aGuidance, aRoute)
        }
    }

    // KNGuidance_LocationGuideDelegate

    // 위치 정보가 변경될 경우 호출
    override fun guidanceDidUpdateLocation(guidance: KNGuidance, locationGuide: KNGuide_Location) {
        naviView.guidanceDidUpdateLocation(guidance, locationGuide)
    }

    // KNGuidance_RouteGuideDelegate

    // 경로 안내 정보 업데이트 시 호출
    override fun guidanceDidUpdateRouteGuide(guidance: KNGuidance, routeGuide: KNGuide_Route) {
        naviView.guidanceDidUpdateRouteGuide(guidance, routeGuide)
    }

    // KNGuidance_SafetyGuideDelegate

    // 안전 운행 정보 업데이트 시 호출
    override fun guidanceDidUpdateSafetyGuide(guidance: KNGuidance, safetyGuide: KNGuide_Safety?) {
        naviView.guidanceDidUpdateSafetyGuide(guidance, safetyGuide)
    }

    // 주변의 안전 운행 정보 업데이트 시 호출
    override fun guidanceDidUpdateAroundSafeties(guidance: KNGuidance, safeties: List<KNSafety>?) {
        naviView.guidanceDidUpdateAroundSafeties(guidance, safeties)
    }

    // KNGuidance_VoiceGuideDelegate

    // 음성 안내 사용 여부
    override fun shouldPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice, newData: MutableList<ByteArray>): Boolean {
        return naviView.shouldPlayVoiceGuide(guidance, voiceGuide, newData)
    }

    // 음성 안내 시작
    override fun willPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) {
        naviView.willPlayVoiceGuide(guidance, voiceGuide)
    }

    // 음성 안내 종료
    override fun didFinishPlayVoiceGuide(guidance: KNGuidance, voiceGuide: KNGuide_Voice) {
        naviView.didFinishPlayVoiceGuide(guidance, voiceGuide)
    }

    // KNGuidance_CitsGuideDelegate

    // CITS 정보 변경 시 호출
    override fun didUpdateCitsGuide(guidance: KNGuidance, citsGuide: KNGuide_Cits) {
        naviView.didUpdateCitsGuide(guidance, citsGuide)
    }
}
