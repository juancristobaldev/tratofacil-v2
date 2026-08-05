#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UserNotifications/UserNotifications.h>

static NSString *currentToken = nil;

@interface PushTokenModule : RCTEventEmitter <RCTBridgeModule>
@end

@implementation PushTokenModule

RCT_EXPORT_MODULE();

+ (void)setToken:(NSString *)token {
  currentToken = token;
  [[NSNotificationCenter defaultCenter] postNotificationName:@"PushTokenRefreshed" object:token];
}

+ (void)handlePushAction:(NSString *)actionId userInfo:(NSDictionary *)userInfo {
  NSMutableDictionary *body = [NSMutableDictionary dictionary];
  body[@"action"] = actionId;
  body[@"data"] = userInfo;
  [[NSNotificationCenter defaultCenter] postNotificationName:@"PushActionReceived" object:body];
}

- (instancetype)init {
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(tokenRefreshed:)
                                                 name:@"PushTokenRefreshed"
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(actionReceived:)
                                                 name:@"PushActionReceived"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)tokenRefreshed:(NSNotification *)notification {
  [self sendEventWithName:@"onPushTokenRefresh" body:notification.object];
}

- (void)actionReceived:(NSNotification *)notification {
  [self sendEventWithName:@"onPushAction" body:notification.object];
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onPushTokenRefresh", @"onPushAction"];
}

RCT_EXPORT_METHOD(getToken:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *token = currentToken;
  if (!token) {
    token = [[NSUserDefaults standardUserDefaults] stringForKey:@"apns_device_token"];
  }
  if (token) {
    resolve(token);
  } else {
    resolve([NSNull null]);
  }
}

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (error) {
      reject(@"PERMISSION_ERROR", error.localizedDescription, error);
    } else {
      dispatch_async(dispatch_get_main_queue(), ^{
        [[UIApplication sharedApplication] registerForRemoteNotifications];
      });
      resolve(@(granted));
    }
  }];
}

RCT_EXPORT_METHOD(getPendingPushAction:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *pending = [[NSUserDefaults standardUserDefaults] stringForKey:@"pending_push_action"];
  if (pending) {
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:@"pending_push_action"];
    resolve(pending);
  } else {
    resolve([NSNull null]);
  }
}

@end
