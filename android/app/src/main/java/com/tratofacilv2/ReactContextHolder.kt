package com.tratofacilv2

import com.facebook.react.bridge.ReactApplicationContext

object ReactContextHolder {
  @Volatile
  var reactContext: ReactApplicationContext? = null
}
