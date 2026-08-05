package com.tratofacilv2.push

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tratofacilv2.MainActivity
import org.json.JSONObject

class PushNotificationService : FirebaseMessagingService() {

  override fun onNewToken(token: String) {
    getSharedPreferences("push_tokens", Context.MODE_PRIVATE)
      .edit()
      .putString("fcm_token", token)
      .apply()
  }

  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    val type = data["type"] ?: return
    val title = data["title"] ?: "TratoFácil"
    val body = data["body"] ?: ""
    val orderId = data["orderId"] ?: "0"

    ensureChannel(type)

    val reactContext = getReactContext()
    if (reactContext != null) {
      val writableMap = Arguments.createMap()
      data.forEach { (k, v) -> writableMap.putString(k, v) }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onPushReceived", writableMap)
    }

    val jsonData = JSONObject(data.toMap())
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      putExtra("push_action", "OPEN")
      putExtra("push_data", jsonData.toString())
    }

    val openPI = PendingIntent.getActivity(
      this, orderId.hashCode(), launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val builder = NotificationCompat.Builder(this, type)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(openPI)
      .setAutoCancel(true)

    if (type == "TRATO_DIRECTO_CREATED") {
      builder.addAction(makeAction("ACCEPT", "Aceptar", jsonData, orderId, 1))
      builder.addAction(makeAction("REJECT", "Rechazar", jsonData, orderId, 2))
    } else if (type == "COTIZACION_RECIBIDA") {
      builder.addAction(makeAction("PAY", "Pagar ahora", jsonData, orderId, 3))
      builder.addAction(makeAction("COUNTER_OFFER", "Contraoferta", jsonData, orderId, 4))
    } else if (type == "CONTRAOFERTA_RECIBIDA") {
      builder.addAction(makeAction("ACCEPT_COUNTER", "Aceptar", jsonData, orderId, 5))
      builder.addAction(makeAction("REJECT_COUNTER", "Rechazar", jsonData, orderId, 6))
    } else if (type == "PAGO_CONFIRMADO" || type == "PROVIDER_EN_CAMINO") {
      builder.addAction(makeAction("NAVIGATE", "Ver ruta", jsonData, orderId, 7))
      builder.addAction(makeAction("CHAT", "Abrir chat", jsonData, orderId, 8))
    } else if (type == "PROVEEDOR_LLEGO") {
      builder.addAction(makeAction("START_SERVICE", "Iniciar servicio", jsonData, orderId, 9))
    } else if (type == "SERVICIO_COMPLETADO") {
      builder.addAction(makeAction("RATE", "Calificar", jsonData, orderId, 10))
    } else if (type == "NUEVO_MENSAJE") {
      builder.addAction(makeAction("OPEN_CHAT", "Responder", jsonData, orderId, 11))
    }

    try {
      NotificationManagerCompat.from(this).notify(orderId.hashCode(), builder.build())
    } catch (e: SecurityException) {
      Log.w("Push", "POST_NOTIFICATIONS missing")
    }
  }

  private fun makeAction(
    actionId: String,
    label: String,
    data: JSONObject,
    orderId: String,
    requestCode: Int,
  ): NotificationCompat.Action {
    val intent = Intent(this, MainActivity::class.java).apply {
      putExtra("push_action", actionId)
      putExtra("push_data", data.toString())
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val pi = PendingIntent.getActivity(
      this, orderId.hashCode() + requestCode, intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    return NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_info_details, label, pi
    ).build()
  }

  private fun ensureChannel(channelId: String) {
    val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (mgr.getNotificationChannel(channelId) != null) return
    val channel = NotificationChannel(channelId, "Tratos Directos", NotificationManager.IMPORTANCE_HIGH)
    mgr.createNotificationChannel(channel)
  }

  private fun getReactContext(): com.facebook.react.bridge.ReactContext? {
    return try {
      val app = applicationContext as? ReactApplication ?: return null
      val host = app.reactHost ?: return null
      val field = host.javaClass.declaredFields
        .firstOrNull { it.type.simpleName == "ReactContext" }
      field?.isAccessible = true
      field?.get(host) as? com.facebook.react.bridge.ReactContext
    } catch (_: Exception) {
      null
    }
  }
}
