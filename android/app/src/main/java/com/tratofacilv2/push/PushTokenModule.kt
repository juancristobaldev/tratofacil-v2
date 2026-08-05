package com.tratofacilv2.push

import android.content.Context
import com.facebook.react.bridge.*
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject

class PushTokenModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PushTokenModule"

  @ReactMethod
  fun getToken(promise: Promise) {
    val prefs = reactApplicationContext.getSharedPreferences("push_tokens", Context.MODE_PRIVATE)
    val cachedToken = prefs.getString("fcm_token", null)
    if (cachedToken != null) {
      promise.resolve(cachedToken)
      return
    }

    FirebaseMessaging.getInstance().token
      .addOnCompleteListener { task ->
        if (task.isSuccessful) {
          promise.resolve(task.result)
        } else {
          promise.resolve(null)
        }
      }
  }

  @ReactMethod
  fun getPendingPushAction(promise: Promise) {
    val prefs = reactApplicationContext.getSharedPreferences("push_pending_actions", Context.MODE_PRIVATE)
    val actionJson = prefs.getString("pending_action", null)
    if (actionJson != null) {
      prefs.edit().remove("pending_action").apply()
      promise.resolve(actionJson)
    } else {
      promise.resolve(null)
    }
  }
}
