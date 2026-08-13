package com.tratofacilv2.location

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationTrackerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "LocationTracker"

  @ReactMethod
  fun startTracking() {
    val context = reactApplicationContext

    // En Android 14+ (targetSdk 34+) arrancar un foreground service con
    // foregroundServiceType="location" exige el permiso de ubicación concedido
    // (FOREGROUND_SERVICE_LOCATION se concede junto al runtime de ubicación).
    // Sin esta guarda podría lanzarse SecurityException/MissingForegroundServiceTypeException.
    val hasLocation =
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
          PackageManager.PERMISSION_GRANTED

    if (!hasLocation) {
      Log.w("LocationTracker", "Sin permiso de ubicación: no se inicia el foreground service")
      return
    }

    try {
      val intent = Intent(context, LocationForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    } catch (e: Exception) {
      // ForegroundServiceStartNotAllowedException (Android 12+) o similar: el SO
      // restringe arrancar un foreground service desde background. No crashear;
      // el rastreo continuará cuando la app vuelva a primer plano.
      Log.w("LocationTracker", "No se pudo iniciar el foreground service", e)
    }
  }

  @ReactMethod
  fun stopTracking() {
    val context = reactApplicationContext
    context.stopService(Intent(context, LocationForegroundService::class.java))
  }

  @ReactMethod
  fun isTracking(promise: Promise) {
    val running = isServiceRunning()
    promise.resolve(running)
  }

  private fun isServiceRunning(): Boolean {
    val manager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
    @Suppress("DEPRECATION")
    for (service in manager.getRunningServices(Int.MAX_VALUE)) {
      if (service.service.className == LocationForegroundService::class.java.name) {
        return true
      }
    }
    return false
  }
}
