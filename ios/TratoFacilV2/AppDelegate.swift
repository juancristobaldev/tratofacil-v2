import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
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
    NotificationCenter.default.post(name: NSNotification.Name("PushTokenRefreshed"), object: token)
    UserDefaults.standard.set(token, forKey: "apns_device_token")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("APNs registration failed: \(error.localizedDescription)")
  }

  // MARK: - Deep Linking (custom URL scheme, e.g. Flow.cl payment return)

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // MARK: - Remote Notification in Background

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    let orderId: Int
    if let idInt = userInfo["orderId"] as? Int {
      orderId = idInt
    } else if let idStr = userInfo["orderId"] as? String, let parsed = Int(idStr) {
      orderId = parsed
    } else {
      orderId = 0
    }

    let payload: [String: Any] = [
      "type": userInfo["type"] as? String ?? "",
      "orderId": orderId,
    ]

    NotificationCenter.default.post(name: NSNotification.Name("PushActionReceived"), object: [
      "action": "BACKGROUND",
      "data": payload,
    ])

    completionHandler(.newData)
  }

  // MARK: - UNUserNotificationCenterDelegate

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    let orderId: Int
    if let idInt = userInfo["orderId"] as? Int {
      orderId = idInt
    } else if let idStr = userInfo["orderId"] as? String, let parsed = Int(idStr) {
      orderId = parsed
    } else {
      orderId = 0
    }

    let payload: [String: Any] = [
      "type": userInfo["type"] as? String ?? "",
      "orderId": orderId,
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
    let orderId: Int
    if let idInt = userInfo["orderId"] as? Int {
      orderId = idInt
    } else if let idStr = userInfo["orderId"] as? String, let parsed = Int(idStr) {
      orderId = parsed
    } else {
      orderId = 0
    }

    let resolvedAction = (actionId == UNNotificationDefaultActionIdentifier) ? "OPEN" : actionId

    if actionId != UNNotificationDismissActionIdentifier {
      let payload: [String: Any] = [
        "type": userInfo["type"] as? String ?? "",
        "orderId": orderId,
        "title": response.notification.request.content.title,
        "body": response.notification.request.content.body,
      ]
      let actionDict: [String: Any] = [
        "action": resolvedAction,
        "data": payload,
      ]

      NotificationCenter.default.post(name: NSNotification.Name("PushActionReceived"), object: actionDict)

      // Guardar también en UserDefaults para cuando la app arranca desde estado cerrado (cold-start)
      if let jsonData = try? JSONSerialization.data(withJSONObject: actionDict),
         let jsonString = String(data: jsonData, encoding: .utf8) {
        UserDefaults.standard.set(jsonString, forKey: "pending_push_action")
      }
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
    let reviewsAction = UNNotificationAction(identifier: "REVIEWS", title: "Ver mis reseñas", options: .foreground)
    let walletAction = UNNotificationAction(identifier: "WALLET", title: "Ver billetera", options: .foreground)
    let contactAction = UNNotificationAction(identifier: "OPEN", title: "Ver solicitud", options: .foreground)

    let categories: Set<UNNotificationCategory> = [
      UNNotificationCategory(identifier: "TRATO_DIRECTO_CREATED", actions: [acceptAction, rejectAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "COTIZACION_RECIBIDA", actions: [payAction, counterOfferAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "CONTRAOFERTA_RECIBIDA", actions: [acceptCounterAction, rejectCounterAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PAGO_CONFIRMADO", actions: [navigateAction, chatAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PROVIDER_EN_CAMINO", actions: [navigateAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PROVEEDOR_POR_LLEGAR", actions: [navigateAction, chatAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "PROVEEDOR_LLEGO", actions: [startAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "SERVICIO_INICIADO", actions: [chatAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "SERVICIO_COMPLETADO", actions: [rateAction, walletAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "NUEVO_MENSAJE", actions: [replyAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "NUEVA_VALORACION", actions: [reviewsAction], intentIdentifiers: [], options: []),
      UNNotificationCategory(identifier: "SOLICITUD_CONTACTO", actions: [contactAction], intentIdentifiers: [], options: []),
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
