import React, { useState } from 'react';
import { usePushNavigation } from '../push/usePushNavigation';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { CustomAlert as Alert } from '../components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DrawerActions, DefaultTheme } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { TOKENS, MAP_BACKGROUND_COLOR } from '../theme';
import { Icon, Avatar, Badge, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';
import { getImageUrl } from '../utils/imageUrl';
import { summarizeForRole } from '../utils/ratings';
import { MainLayout } from '../components/layout/MainLayout';
import { Header } from '../components/layout/Header';
import { useRefresh } from '../context/RefreshContext';
import { BottomSheetProvider } from '../bottom-sheet/core/BottomSheetProvider';
const ROUTE_TITLES: Record<string, string> = {
  GuestCheckout: 'Datos de Contacto',
  ProviderProfile: 'Perfil Profesional',
  Wallet: 'Mi Billetera',
  Plans: 'Planes y Suscripción',
  MyProfile: 'Editar Perfil',
  Settings: 'Ajustes',
  Support: 'Soporte y Ayuda',
  MyServices: 'Mis Servicios',
  PublishService: 'Publicar Servicio',
  BecomeProvider: 'Hazte Profesional',
  MarketplacePlans: 'Planes para Vendedores',
  Rating: 'Calificar Servicio',
  Billing: 'Facturación',
  VerificationCenter: 'Centro de Verificación',
  ReviewsList: 'Reseñas',
  MyJobs: 'Mis Trabajos Publicados',
  PublishJob: 'Ofrecer Trabajo',
  PublishProduct: 'Publicar Producto',
  ProductDetail: 'Detalle del Producto',
  Shipping: 'Datos de Envío',
  Purchase: 'Confirmar Compra',
  OrderDetail: 'Detalle del Pedido',
  ManageSale: 'Gestionar Venta',
};

const HEADER_CONFIG: Record<string, { showHelp?: boolean; subtitle?: string }> = {
  Settings: { showHelp: false },
  Wallet: { showHelp: false },
  Billing: { showHelp: false },
  Plans: { showHelp: false, subtitle: 'Elige tu plan ideal' },
  Support: { showHelp: false, subtitle: 'Centro de ayuda' },
  VerificationCenter: { subtitle: 'Completa tu perfil para operar sin restricciones' },
  MyProfile: { subtitle: 'Tu información personal' },
  ReviewsList: { showHelp: false },
  PublishService: { showHelp: false, subtitle: 'Agrega un nuevo servicio a tu catálogo' },
  BecomeProvider: { showHelp: false, subtitle: 'Activa tu cuenta profesional' },
  MarketplacePlans: { showHelp: false, subtitle: 'Elige tu plan de vendedor' },
  PublishJob: { showHelp: false, subtitle: 'Ofrece trabajo a profesionales' },
  PublishProduct: { showHelp: false, subtitle: 'Publica tu producto en el marketplace' },
  Shipping: { showHelp: false, subtitle: 'Ingresa los datos de envío' },
  Purchase: { showHelp: false },
  OrderDetail: { showHelp: false },
  ManageSale: { showHelp: false },
  MyServices: { subtitle: 'Administra los servicios que ofreces' },
  MyJobs: { subtitle: 'Gestiona tus ofertas laborales publicadas' },
  ProviderProfile: { subtitle: 'Información del profesional' },
};

const HeaderGeneral: React.FC<{ currentRoute: string; navigationRef: any }> = ({ currentRoute, navigationRef }) => {
  const { isRefreshing } = useRefresh();
  const hiddenScreens = ['Splash', 'Onboarding', 'Login', 'Register', 'GuestCheckout', 'ServiceSuccess', 'SetPassword', 'PaymentSuccess', 'PaymentConfirming', 'PaymentFailed'];
  if (hiddenScreens.includes(currentRoute)) {
    return null;
  }

  const isPrimary = ['MainApp', 'MainLayout'].includes(currentRoute);

  if (isPrimary) {
    return (
      <Header
        showMenu={true}
        showLogo={true}
        isRefreshing={isRefreshing}
        onMenuPress={() => {
          navigationRef.dispatch(DrawerActions.toggleDrawer());
        }}
      />
    );
  }

  const title = ROUTE_TITLES[currentRoute] || 'TratoFácil';
  const pageConfig = HEADER_CONFIG[currentRoute] || {};
  const noBackScreens = ['ServiceSuccess'];
  const showBack = !noBackScreens.includes(currentRoute);

  return (
    <Header
      showBack={showBack}
      showLogo={false}
      title={title}
      subtitle={pageConfig.subtitle}
      showHelp={pageConfig.showHelp !== false}
      isRefreshing={isRefreshing}
      onBackPress={() => {
        navigationRef.goBack();
      }}
    />
  );
};

// SCREENS
import { SplashScreen } from '../screens/auth/SplashScreen';
import { SetPasswordScreen } from '../screens/auth/SetPasswordScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { GuestCheckoutScreen } from '../screens/auth/GuestCheckoutScreen';
import { ProviderProfileScreen } from '../screens/client/ProviderProfileScreen';
import { ServiceSuccessScreen } from '../screens/client/ServiceSuccessScreen';
import { WalletScreen } from '../screens/provider/WalletScreen';
import { PlansScreen } from '../screens/provider/PlansScreen';
import { MyProfileScreen } from '../screens/shared/MyProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { SupportScreen } from '../screens/shared/SupportScreen';
import { MyServicesScreen } from '../screens/shared/MyServicesScreen';
import { PublishServiceScreen } from '../screens/shared/PublishServiceScreen';
import { BecomeProviderScreen } from '../screens/shared/BecomeProviderScreen';
import { MarketplacePlansScreen } from '../screens/shared/MarketplacePlansScreen';
import { PublishJobScreen } from '../screens/shared/PublishJobScreen';
import { PublishProductScreen } from '../screens/shared/PublishProductScreen';
import { RatingScreen } from '../screens/shared/RatingScreen';
import { BillingScreen } from '../screens/shared/BillingScreen';
import { VerificationCenterScreen } from '../screens/shared/VerificationCenterScreen';
import { ReviewsListScreen } from '../screens/shared/ReviewsListScreen';
import { MyJobsScreen } from '../screens/client/MyJobsScreen';
import { ProductDetailScreen } from '../screens/client/ProductDetailScreen';
import { ShippingScreen } from '../screens/shared/ShippingScreen';
import { PurchaseScreen } from '../screens/shared/PurchaseScreen';
import { PaymentSuccessScreen } from '../screens/shared/PaymentSuccessScreen';
import { PaymentConfirmingScreen } from '../screens/shared/PaymentConfirmingScreen';
import { PaymentFailedScreen } from '../screens/shared/PaymentFailedScreen';
import { OrderDetailScreen } from '../screens/shared/OrderDetailScreen';
import { ManageSaleScreen } from '../screens/shared/ManageSaleScreen';
import { drainPendingPaymentReturn } from '../payments/PaymentReturnHandler';

export { useAuth as useRole } from '../context/AuthContext';

// STACK NAVIGATORS
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// CUSTOM DRAWER CONTENT
export const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { role, user, logout, setRole } = useAuth();
  const realtime = useRealtime();
  const { navigation } = props;

  const userName = user?.displayName || user?.username || 'Usuario';
  const userEmail = user?.email || '';
  const userAvatar = getImageUrl(user?.provider?.logoImage?.cdnUrl || null);
  const hasProvider = !!user?.provider;

  const clientRating = summarizeForRole(user, 'client');
  const providerRating = summarizeForRole(user?.provider, 'provider');

  const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
  const providerOrder = realtime?.providerActiveOrder ?? user?.provider?.activeRealtimeOrder ?? null;
  const hasActiveProviderOrder = !!providerOrder && !TERMINAL_STATUSES.includes(providerOrder.status);

  const handleSwitchRole = () => {
    navigation.dispatch(DrawerActions.closeDrawer());
    if (role === 'provider') {
      if (hasActiveProviderOrder) {
        Alert.alert(
          'Servicio en curso',
          'No puedes cambiar a modo cliente mientras tengas una orden en curso.',
          [{ text: 'Entendido' }]
        );
        return;
      }
      if (realtime?.isRealtimeActive) {
        Alert.alert(
          'Desconexión de Proveedor',
          'Te desconectarás y dejarás de recibir órdenes. ¿Deseas continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Desconectar y cambiar',
              style: 'destructive',
              onPress: () => {
                realtime.toggleAvailability(false);
                setRole('client');
              },
            },
          ]
        );
        return;
      }
      setRole('client');
    } else if (!hasProvider) {
      // Cliente sin provider → flujo guiado de registro (referencia Web: registerProvider → verification-center)
      navigation.navigate('BecomeProvider');
    } else if (!user?.isProfileFullyComplete) {
      // Tiene provider pero perfil incompleto → completar perfil
      navigation.navigate('VerificationCenter');
    } else {
      setRole('provider');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      {/* DRAWER HEADER BASED ON ROLE */}
      {role === 'guest' ? (
        <View style={styles.drawerHeaderGuest}>
          <View style={styles.guestAvatarCircle}>
            <Icon name="User" size={28} color={TOKENS.colors.textSubtle} />
          </View>
          <Text style={styles.drawerName}>Invitado</Text>
          <Badge label="MODO INVITADO" tone="neutral" style={styles.drawerRoleBadge} />
        </View>
      ) : role === 'client' ? (
        <View style={styles.drawerHeaderClient}>
          <View style={styles.avatarRow}>
            <Avatar uri={userAvatar} name={userName} size={56} />
            {clientRating && (
              <View style={styles.ratingBadge}>
                <Icon name="Star" size={10} color={TOKENS.colors.starActive} />
                <Text style={styles.ratingBadgeText}>{clientRating.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.drawerName}>{userName}</Text>
          <Text style={styles.drawerEmail}>{userEmail}</Text>
          <Badge label="MODO CLIENTE" tone="brand" style={styles.drawerRoleBadge} />
        </View>
      ) : (
        <View style={styles.drawerHeaderProvider}>
          <View style={styles.avatarRow}>
            <Avatar
              uri={userAvatar}
              name={userName}
              size={56}
            />
            {providerRating && (
              <View style={styles.ratingBadge}>
                <Icon name="Star" size={10} color={TOKENS.colors.starActive} />
                <Text style={styles.ratingBadgeText}>{providerRating.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.drawerName}>{userName}</Text>
          <Text style={styles.drawerEmail}>{userEmail}</Text>
          <Badge label="MODO PROFESIONAL" tone="success" style={styles.drawerRoleBadge} />
        </View>
      )}

      {/* DRAWER NAV ITEMS */}
      <ScrollView contentContainerStyle={styles.drawerItemsScroll}>
        {role === 'guest' && (
          <>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Support')}>
              <Icon name="HelpCircle" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Ayuda & Soporte</Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'client' && (
          <>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('MyJobs')}>
              <Icon name="Briefcase" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Mis Trabajos Publicados</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('MyProfile')}>
              <Icon name="User" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Mi Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Settings')}>
              <Icon name="Settings" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Configuración</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Billing')}>
              <Icon name="CreditCard" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Facturación y Pagos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Support')}>
              <Icon name="HelpCircle" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Ayuda & Soporte</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
          </>
        )}

        {role === 'provider' && (
          <>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('MainApp')}>
              <Icon name="Grid" size={18} color={TOKENS.colors.statusSuccess} />
              <Text style={[styles.drawerItemText, { color: TOKENS.colors.statusSuccess }]}>Panel de Solicitudes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('MyServices')}>
              <Icon name="Wrench" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Mis Servicios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Wallet')}>
              <Icon name="PieChart" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Billetera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Billing')}>
              <Icon name="CreditCard" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Facturación y Pagos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Plans')}>
              <Icon name="Crown" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Planes Profesionales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('MyProfile')}>
              <Icon name="User" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Mi Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Settings')}>
              <Icon name="Settings" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Configuración</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => navigation.navigate('Support')}>
              <Icon name="HelpCircle" size={18} color={TOKENS.colors.textSubtle} />
              <Text style={styles.drawerItemText}>Ayuda & Soporte</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
          </>
        )}
      </ScrollView>

      {/* DRAWER FOOTER */}
      <View style={styles.drawerFooter}>
        {role !== 'guest' && (
          <>
            {(() => {
              // Estado del CTA según rol y perfil
              const cta = (() => {
                if (role === 'provider') {
                  return {
                    label: 'Cambiar a Modo Cliente',
                    icon: 'User' as const,
                    color: TOKENS.colors.brand600,
                    accent: '#059669',
                    isProvider: true,
                  };
                }
                if (!hasProvider) {
                  return {
                    label: 'Hazte Profesional',
                    icon: 'Zap' as const,
                    color: '#059669',
                    accent: '#059669',
                    isProvider: false,
                    highlighted: true,
                  };
                }
                if (!user?.isProfileFullyComplete) {
                  return {
                    label: 'Completa tu Perfil Profesional',
                    icon: 'ShieldCheck' as const,
                    color: TOKENS.colors.warning600,
                    accent: TOKENS.colors.warning600,
                    isProvider: false,
                  };
                }
                return {
                  label: 'Cambiar a Modo Profesional',
                  icon: 'Briefcase' as const,
                  color: '#059669',
                  accent: '#059669',
                  isProvider: false,
                };
              })();

              return (
                <TouchableOpacity
                  style={[
                    styles.drawerItemSwitch,
                    cta.isProvider ? styles.drawerItemSwitchClient : styles.drawerItemSwitchProvider,
                    cta.highlighted && styles.drawerItemSwitchHighlight,
                  ]}
                  onPress={handleSwitchRole}
                  activeOpacity={0.75}
                >
                  <View style={styles.switchIconLabelRow}>
                    <View
                      style={[
                        styles.switchIconBadge,
                        cta.isProvider ? styles.switchIconBadgeClient : styles.switchIconBadgeProvider,
                      ]}
                    >
                      <Icon name={cta.icon} size={16} color={cta.color} />
                    </View>
                    <Text
                      style={[
                        styles.drawerItemSwitchText,
                        cta.isProvider ? styles.drawerItemSwitchTextClient : styles.drawerItemSwitchTextProvider,
                      ]}
                    >
                      {cta.label}
                    </Text>
                  </View>
                  <Icon name="ChevronRight" size={15} color={cta.accent} />
                </TouchableOpacity>
              );
            })()}

            <View style={styles.drawerFooterDivider} />
          </>
        )}

        {role === 'guest' ? (
          <View style={styles.guestFooterBtns}>
            <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login')} style={styles.guestBtn} />
            <Button title="Registrarme" variant="secondary" onPress={() => navigation.navigate('Register')} style={[styles.guestBtn, { marginTop: 8 }]} />
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Icon name="LogOut" size={18} color={TOKENS.colors.textSubtle} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const MainDrawerNavigator: React.FC = () => {
  const { width } = useWindowDimensions();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: Math.min(width * 0.78, 400), borderTopRightRadius: 24, borderBottomRightRadius: 24 },
      }}
    >
      <Drawer.Screen name="MainLayout" component={MainLayoutWithSheets} />
    </Drawer.Navigator>
  );
};

const MainLayoutWithSheets: React.FC = () => (
  <BottomSheetProvider>
    <MainLayout />
  </BottomSheetProvider>
);

function PushNavigationTracker() {
  usePushNavigation();
  return null;
}

// MAIN ROUTING STACK
export const AppNavigator: React.FC = () => {
  const [currentRouteName, setCurrentRouteName] = useState('Splash');

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: MAP_BACKGROUND_COLOR,
    },
  };

  return (
    <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onReady={() => drainPendingPaymentReturn()}
        onStateChange={() => {
          const route = navigationRef.getCurrentRoute() as any;
          if (route) {
            setCurrentRouteName(route.name);
          }
        }}
      >
        <PushNavigationTracker />
        <View style={{ flex: 1, backgroundColor: MAP_BACKGROUND_COLOR }}>
            <HeaderGeneral currentRoute={currentRouteName} navigationRef={navigationRef} />
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              {/* Auth Stack */}
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="SetPassword" component={SetPasswordScreen} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="GuestCheckout" component={GuestCheckoutScreen} />

              {/* Main App (Drawer + Layout + BottomNav + Panels) */}
              <Stack.Screen name="MainApp" component={MainDrawerNavigator} />

              {/* Shared screens (pushed above MainApp, without BottomNav) */}
              <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
              <Stack.Screen name="ServiceSuccess" component={ServiceSuccessScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="Wallet" component={WalletScreen} />
              <Stack.Screen name="Plans" component={PlansScreen} />
              <Stack.Screen name="MyProfile" component={MyProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="MyServices" component={MyServicesScreen} />
              <Stack.Screen name="PublishService" component={PublishServiceScreen} />
              <Stack.Screen name="BecomeProvider" component={BecomeProviderScreen} />
              <Stack.Screen name="MarketplacePlans" component={MarketplacePlansScreen} />
              <Stack.Screen name="PublishJob" component={PublishJobScreen} />
              <Stack.Screen name="MyJobs" component={MyJobsScreen} />
              <Stack.Screen name="PublishProduct" component={PublishProductScreen} />
              <Stack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="Billing" component={BillingScreen} />
              <Stack.Screen name="VerificationCenter" component={VerificationCenterScreen} />
              <Stack.Screen name="ReviewsList" component={ReviewsListScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="Shipping" component={ShippingScreen} />
              <Stack.Screen name="Purchase" component={PurchaseScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="PaymentConfirming" component={PaymentConfirmingScreen} options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
              <Stack.Screen name="PaymentFailed" component={PaymentFailedScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="ManageSale" component={ManageSaleScreen} />
            </Stack.Navigator>
        </View>
      </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: TOKENS.colors.white },
  drawerHeaderGuest: { padding: TOKENS.spacing.lg, paddingTop: 0, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  guestAvatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: TOKENS.colors.surface200, alignItems: 'center', justifyContent: 'center', marginBottom: TOKENS.spacing.sm },
  drawerHeaderClient: { padding: TOKENS.spacing.lg, paddingTop: 0, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  drawerHeaderProvider: { padding: TOKENS.spacing.lg, paddingTop: 0, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: TOKENS.spacing.sm },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.white, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  ratingBadgeText: { fontSize: 10, fontWeight: 'bold', color: TOKENS.colors.textMain },
  drawerName: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  drawerEmail: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2, fontWeight: '500' },
  drawerRoleBadge: { marginTop: 8, alignSelf: 'flex-start' },
  drawerItemsScroll: { padding: TOKENS.spacing.sm, gap: 4, paddingTop: TOKENS.spacing.xs },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: TOKENS.spacing.md, borderRadius: 12, gap: TOKENS.spacing.md },
  drawerItemText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  drawerDivider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 8, marginHorizontal: TOKENS.spacing.md },
  drawerItemSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  drawerItemSwitchProvider: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  drawerItemSwitchClient: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand200,
  },
  drawerItemSwitchHighlight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 2,
  },
  switchIconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
    flex: 1,
  },
  switchIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchIconBadgeProvider: {
    backgroundColor: '#DCFCE7',
  },
  switchIconBadgeClient: {
    backgroundColor: TOKENS.colors.brand100,
  },
  drawerItemSwitchText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  drawerItemSwitchTextProvider: {
    color: '#15803D',
  },
  drawerItemSwitchTextClient: {
    color: TOKENS.colors.brand600,
  },
  drawerFooterDivider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface100,
    marginVertical: 10,
    marginHorizontal: 4,
  },
  drawerFooter: {
    padding: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  logoutText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  guestFooterBtns: { width: '100%' },
  guestBtn: { height: 44 },
});
