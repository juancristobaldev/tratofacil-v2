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
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tratofacilv2.MainActivity
import com.tratofacilv2.ReactContextHolder
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

    val channelId = ensureChannel(type)

    val reactContext = getReactContext()
    val isInForeground = reactContext != null && reactContext.hasActiveReactInstance()
    if (isInForeground) {
      try {
        val writableMap = Arguments.createMap()
        data.forEach { (k, v) -> writableMap.putString(k, v) }
        reactContext!!
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("onPushReceived", writableMap)
      } catch (e: Exception) {
        Log.w("Push", "No se pudo emitir evento a JS", e)
      }
      return
    }

    val jsonData = JSONObject(data.toMap())
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      putExtra("push_action", "OPEN")
      putExtra("push_data", jsonData.toString())
    }

    val notifId = ((type.hashCode() and 0x7FFF) * 31) + (orderId.hashCode() and 0xFFFF)

    val openPI = PendingIntent.getActivity(
      this, notifId, launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val builder = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(openPI)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)

    if (type == "TRATO_DIRECTO_CREATED") {
      builder.addAction(makeAction("ACCEPT", "Aceptar", jsonData, orderId, 1))
      builder.addAction(makeAction("REJECT", "Rechazar", jsonData, orderId, 2))
    } else if (type == "COTIZACION_RECIBIDA") {
      builder.addAction(makeAction("PAY", "Pagar ahora", jsonData, orderId, 3))
      builder.addAction(makeAction("COUNTER_OFFER", "Contraoferta", jsonData, orderId, 4))
    } else if (type == "CONTRAOFERTA_RECIBIDA") {
      builder.addAction(makeAction("ACCEPT_COUNTER", "Aceptar", jsonData, orderId, 5))
      builder.addAction(makeAction("REJECT_COUNTER", "Rechazar", jsonData, orderId, 6))
    } else if (type == "CONTRAOFERTA_ACEPTADA" || type == "CONTRAOFERTA_RECHAZADA") {
      builder.addAction(makeAction("OPEN", "Ver orden", jsonData, orderId, 7))
    } else if (type == "PAGO_CONFIRMADO" || type == "PROVIDER_EN_CAMINO" || type == "PROVEEDOR_POR_LLEGAR") {
      builder.addAction(makeAction("NAVIGATE", "Ver ruta", jsonData, orderId, 8))
      builder.addAction(makeAction("CHAT", "Abrir chat", jsonData, orderId, 9))
    } else if (type == "PROVEEDOR_LLEGO") {
      builder.addAction(makeAction("START_SERVICE", "Iniciar servicio", jsonData, orderId, 10))
      builder.addAction(makeAction("CHAT", "Abrir chat", jsonData, orderId, 11))
    } else if (type == "SERVICIO_INICIADO") {
      builder.addAction(makeAction("OPEN", "Ver servicio", jsonData, orderId, 12))
      builder.addAction(makeAction("CHAT", "Abrir chat", jsonData, orderId, 13))
    } else if (type == "SERVICIO_COMPLETADO") {
      val action = data["action"] ?: "RATE"
      if (action == "WALLET") {
        builder.addAction(makeAction("WALLET", "Ver billetera", jsonData, orderId, 14))
      } else {
        builder.addAction(makeAction("RATE", "Calificar", jsonData, orderId, 14))
      }
    } else if (type == "NUEVO_MENSAJE") {
      builder.addAction(makeAction("OPEN_CHAT", "Responder", jsonData, orderId, 15))
    } else if (type == "NUEVA_VALORACION") {
      builder.addAction(makeAction("REVIEWS", "Ver mis reseñas", jsonData, orderId, 16))
    } else if (type == "SOLICITUD_CONTACTO") {
      builder.addAction(makeAction("OPEN", "Ver contacto", jsonData, orderId, 17))
    }

    try {
      NotificationManagerCompat.from(this).notify(notifId, builder.build())
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

  private data class ChannelConfig(
    val id: String,
    val name: String,
    val desc: String,
    val importance: Int,
  )

  private fun ensureChannel(type: String): String {
    val config = when (type) {
      "NUEVO_MENSAJE" -> ChannelConfig(
        "chat_channel",
        "Mensajes y Chat",
        "Notificaciones de nuevos mensajes en el chat de servicios",
        NotificationManager.IMPORTANCE_HIGH
      )
      "PAGO_CONFIRMADO", "COTIZACION_RECIBIDA", "CONTRAOFERTA_RECIBIDA", "CONTRAOFERTA_ACEPTADA", "CONTRAOFERTA_RECHAZADA" -> ChannelConfig(
        "payments_channel",
        "Pagos y Cotizaciones",
        "Alertas de cotizaciones, contraofertas y confirmaciones de pago",
        NotificationManager.IMPORTANCE_HIGH
      )
      "NUEVA_VALORACION" -> ChannelConfig(
        "reviews_channel",
        "Calificaciones y Reseñas",
        "Notificaciones de calificaciones y comentarios recibidos",
        NotificationManager.IMPORTANCE_DEFAULT
      )
      else -> ChannelConfig(
        "orders_channel",
        "Tratos y Servicios",
        "Actualizaciones de estado de solicitudes, llegada y ejecución de servicios",
        NotificationManager.IMPORTANCE_HIGH
      )
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (mgr.getNotificationChannel(config.id) == null) {
        val channel = NotificationChannel(config.id, config.name, config.importance).apply {
          description = config.desc
          enableLights(true)
          enableVibration(true)
          setShowBadge(true)
        }
        mgr.createNotificationChannel(channel)
      }
    }
    return config.id
  }

  private fun getReactContext(): com.facebook.react.bridge.ReactContext? {
    return ReactContextHolder.reactContext
  }
}
