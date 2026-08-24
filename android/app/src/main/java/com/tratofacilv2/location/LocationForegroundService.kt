package com.tratofacilv2.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.tratofacilv2.MainActivity

class LocationForegroundService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        buildNotification(),
        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
      )
    } else {
      startForeground(NOTIFICATION_ID, buildNotification())
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // El servicio solo mantiene vivo el proceso para que el watchPosition de JS siga
    // reportando. No debe recrearse por sí solo si el SO lo detiene: proceso muerto
    // significa que la orden ya no está activa en esta instancia.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
  }

  private fun ensureChannel() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Tratos Directos",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Mantiene el rastreo de ubicación durante un servicio en curso"
      }
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    val contentIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      contentIntent,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      },
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("TratoDirecto")
      .setContentText("Rastreando tu ubicación del servicio en curso")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "trato_location"
    private const val NOTIFICATION_ID = 1001
  }
}
