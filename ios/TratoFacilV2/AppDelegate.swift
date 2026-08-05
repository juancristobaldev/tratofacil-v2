import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    GMSServices.provideAPIKey("AIzaSyD7ErAxf6bmJ2Xl4st4pPL_yWp4tUHTqFc")

    UNUserNotificationCenter.current().delegate = self
    registerNotificationCategories()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "TratoFacilV2",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    PushTokenModule.setToken(token)
    UserDefaults.standard.set(token, forKey: "apns_device_token")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("APNs registration failed: \(error.localizedDescription)")
  }

  // MARK: - UNUserNotificationCenterDelegate

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    let payload: [String: Any] = [
      "type": userInfo["type"] as? String ?? "",
      "orderId": userInfo["orderId"] as? Int ?? 0,
      "title": notification.request.content.title,
      "body": notification.request.content.body,
    ]
    NotificationCenter.default.post(name: NSNotification.Name("PushActionReceived"), object: [
      "action": "FOREGROUND",
      "data": payload,
    ])
    completionHandler([.banner, .sound, .badge])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    let actionId = response.actionIdentifier

    if actionId != UNNotificationDefaultActionIdentifier && actionId != UNNotificationDismissActionIdentifier {
      let payload: [String: Any] = [
        "type": userInfo["type"] as? String ?? "",
        "orderId": userInfo["orderId"] as? Int ?? 0,
        "title": response.notification.request.content.title,
        "body": response.notification.request.content.body,
      ]
      PushTokenModule.handlePushAction(actionId, userInfo: payload)
    } else if actionId == UNNotificationDefaultActionIdentifier {
      let payload: [String: Any] = [
        "type": userInfo["type"] as? String ?? "",
        "orderId": userInfo["orderId"] as? Int ?? 0,
      ]
      UserDefaults.standard.set([
        "action": "OPEN",
        "data": payload,
      ], forKey: "pending_push_action")
    }

    completionHandler()
  }

  // MARK: - Notification Categories

  private func registerNotificationCategories() {
    let acceptAction = UNNotificationAction(identifier: "ACCEPT", title: "Aceptar", options: .foreground)
    let rejectAction = UNNotificationAction(identifier: "REJECT", title: "Rechazar", options: .destructive)
    let payAction = UNNotificationAction(identifier: "PAY", title: "Pagar ahora", options: .foreground)
    let counterOfferAction = UNNotificationAction(identifier: "COUNTER_OFFER", title: "Contraoferta", options: .foreground)
    let acceptCounterAction = UNNotificationAction(identifier: "ACCEPT_COUNTER", title: "Aceptar", options: .foreground)
    let rejectCounterAction = UNNotificationAction(identifier: "REJECT_COUNTER", title: "Rechazar", options: .destructive)
    let navigateAction = UNNotificationAction(identifier: "NAVIGATE", title: "Ver ruta", options: .foreground)
    let chatAction = UNNotificationAction(identifier: "CHAT", title: "Abrir chat", options: .foreground)
    let startAction = UNNotificationAction(identifier: "START_SERVICE", title: "Iniciar servicio", options: .foreground)
    let rateAction = UNNotificationAction(identifier: "RATE", title: "Calificar", options: .foreground)
    let replyAction = UNNotificationAction(identifier: "OPEN_CHAT", title: "Responder", options: .foreground)

    let categories: Set<UNNotificationCategory> = [
      UNNotificationCategory(identifier: "TRATO_DIRECTO_CREATED", actions: [acceptAction, rejectAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "COTIZACION_RECIBIDA", actions: [payAction, counterOfferAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "CONTRAOFERTA_RECIBIDA", actions: [acceptCounterAction, rejectCounterAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PAGO_CONFIRMADO", actions: [navigateAction, chatAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PROVIDER_EN_CAMINO", actions: [navigateAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PROVEEDOR_LLEGO", actions: [startAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "SERVICIO_COMPLETADO", actions: [rateAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "NUEVO_MENSAJE", actions: [replyAction], intentIdentifiers: [], options: []),
    ]

    UNUserNotificationCenter.current().setNotificationCategories(categories)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
