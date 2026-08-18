import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ApolloProvider } from '@apollo/client/react';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LocationProvider } from './src/context/LocationContext';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { PushProvider } from './src/push/PushProvider';
import { RealtimeProvider } from './src/realtime/RealtimeContext';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { client } from './src/graphql/apollo';
import { initializeDeepLinks } from './src/utils/deepLinks';
import { PaymentReturnGate } from './src/payments/PaymentReturnGate';
// Removed BottomSheetProvider
import { FocusSessionProvider } from './src/features/focus-session/FocusSessionProvider';

function DeepLinkSetup() {
  useEffect(() => {
    const cleanup = initializeDeepLinks();
    return cleanup;
  }, []);
  return null;
}

function App() {
  const handleRootLayout = (e: any) => {
    if (__DEV__) {
      const { width, height, x, y } = e.nativeEvent.layout;
      console.log(`[BS:ROOT_LAYOUT] width=${width} height=${height} x=${x} y=${y}`);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={handleRootLayout}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <ErrorBoundary>
          <ApolloProvider client={client}>
            <AuthProvider>
              <PushProvider>
                <LocationProvider>
                  <NotificationProvider>
                  <DeepLinkSetup />
                  <RealtimeProvider>
                  <PaymentReturnGate />
                  <CategoriesProvider>
                  <RefreshProvider>
                    <FocusSessionProvider>
                      <AppNavigator />
                    </FocusSessionProvider>
                  </RefreshProvider>
                  </CategoriesProvider>
                  </RealtimeProvider>
                  </NotificationProvider>
                </LocationProvider>
              </PushProvider>
            </AuthProvider>
          </ApolloProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
