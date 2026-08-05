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
import { client } from './src/graphql/apollo';
import { initializeDeepLinks } from './src/utils/deepLinks';

function DeepLinkSetup() {
  useEffect(() => {
    const cleanup = initializeDeepLinks();
    return cleanup;
  }, []);
  return null;
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ErrorBoundary>
          <ApolloProvider client={client}>
            <AuthProvider>
              <PushProvider>
                <LocationProvider>
                  <NotificationProvider>
                  <DeepLinkSetup />
                  <RefreshProvider>
                    <AppNavigator />
                  </RefreshProvider>
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
