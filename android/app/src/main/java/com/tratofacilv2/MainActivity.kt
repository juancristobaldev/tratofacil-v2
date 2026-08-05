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
      json.put("data", data)
      getSharedPreferences("push_pending_actions", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_action", json.toString())
        .apply()
    }
  }

  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    super.onCreate(savedInstanceState)

    val action = intent?.getStringExtra("push_action")
    val data = intent?.getStringExtra("push_data")
    if (action != null && data != null) {
      val json = org.json.JSONObject()
      json.put("action", action)
      json.put("data", data)
      getSharedPreferences("push_pending_actions", Context.MODE_PRIVATE)
        .edit()
        .putString("pending_action", json.toString())
        .apply()
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
