package com.tratofacilv2

import android.content.Context
import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "TratoFacilV2"

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)

    val action = intent.getStringExtra("push_action")
    val data = intent.getStringExtra("push_data")
    if (action != null && data != null) {
      val json = org.json.JSONObject()
      json.put("action", action)
      val dataObj = try {
        org.json.JSONObject(data)
      } catch (e: Exception) {
        null
      }
      if (dataObj != null) {
        json.put("data", dataObj)
      } else {
        json.put("data", data)
      }
      getSharedPreferences("push_pending_actions", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_action", json.toString())
        .apply()

      // Notificación inmediata al puente JS si React Native está activo
      try {
        val reactContext = ReactContextHolder.reactContext
        if (reactContext != null && reactContext.hasActiveReactInstance()) {
          val map = com.facebook.react.bridge.Arguments.createMap()
          map.putString("action", action)
          val dataMap = com.facebook.react.bridge.Arguments.createMap()
          if (dataObj != null) {
            val keys = dataObj.keys()
            while (keys.hasNext()) {
              val key = keys.next()
              dataMap.putString(key, dataObj.optString(key))
            }
          }
          map.putMap("data", dataMap)
          reactContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onPushAction", map)
        }
      } catch (e: Exception) {
        // El puente consumirá pending_action al inicializarse
      }
    }
  }

  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false)
    super.onCreate(null)

    val action = intent?.getStringExtra("push_action")
    val data = intent?.getStringExtra("push_data")
    if (action != null && data != null) {
      val json = org.json.JSONObject()
      json.put("action", action)
      try {
        json.put("data", org.json.JSONObject(data))
      } catch (e: Exception) {
        json.put("data", data)
      }
      getSharedPreferences("push_pending_actions", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_action", json.toString())
        .apply()
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
