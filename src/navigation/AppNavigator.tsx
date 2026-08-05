import React, { useState } from 'react';
import { usePushNavigation } from '../push/usePushNavigation';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { NavigationContainer, useNavigationContainerRef, DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { TOKENS } from '../theme';
import { Icon, Avatar, Badge, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { PanelProvider, usePanel } from '../context/PanelContext';
import { getImageUrl } from '../utils/imageUrl';
import { MainLayout } from '../components/layout/MainLayout';
import { Header } from '../components/layout/Header';
import { useRefresh } from '../context/RefreshContext';
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

const HEADER_CONFIG: Record<string, { showBell?: boolean; subtitle?: string }> = {
  Settings: { showBell: false },
  Wallet: { showBell: false },
  Billing: { showBell: false },
  Plans: { showBell: false, subtitle: 'Elige tu plan ideal' },
  Support: { showBell: false, subtitle: 'Centro de ayuda' },
  VerificationCenter: { subtitle: 'Completa tu perfil para operar sin restricciones' },
  MyProfile: { subtitle: 'Tu información personal' },
  ReviewsList: { showBell: false },
  PublishService: { showBell: false, subtitle: 'Agrega un nuevo servicio a tu catálogo' },
  PublishJob: { showBell: false, subtitle: 'Ofrece trabajo a profesionales' },
  PublishProduct: { showBell: false, subtitle: 'Publica tu producto en el marketplace' },
  Shipping: { showBell: false, subtitle: 'Ingresa los datos de envío' },
  Purchase: { showBell: false },
  OrderDetail: { showBell: false },
  ManageSale: { showBell: false },
  MyServices: { subtitle: 'Administra los servicios que ofreces' },
  ProviderProfile: { subtitle: 'Información del profesional' },
};

const HeaderGeneral: React.FC<{ currentRoute: string; navigationRef: any }> = ({ currentRoute, navigationRef }) => {
  const { isRefreshing } = useRefresh();
  const hiddenScreens = ['Splash', 'Onboarding', 'Login', 'Register', 'GuestCheckout', 'ServiceSuccess', 'SetPassword', 'PaymentSuccess'];
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
  const noBackScreens = ['Rating', 'ServiceSuccess'];
  const showBack = !noBackScreens.includes(currentRoute);

  return (
    <Header
      showBack={showBack}
      showLogo={false}
      title={title}
      subtitle={pageConfig.subtitle}
      showBell={pageConfig.showBell !== false}
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
import { PublishJobScreen } from '../screens/shared/PublishJobScreen';
import { PublishProductScreen } from '../screens/shared/PublishProductScreen';
import { RatingScreen } from '../screens/shared/RatingScreen';
import { BillingScreen } from '../screens/shared/BillingScreen';
import { VerificationCenterScreen } from '../screens/shared/VerificationCenterScreen';
import { ReviewsListScreen } from '../screens/shared/ReviewsListScreen';
import { ProductDetailScreen } from '../screens/client/ProductDetailScreen';
import { ShippingScreen } from '../screens/shared/ShippingScreen';
import { PurchaseScreen } from '../screens/shared/PurchaseScreen';
import { PaymentSuccessScreen } from '../screens/shared/PaymentSuccessScreen';
import { OrderDetailScreen } from '../screens/shared/OrderDetailScreen';
import { ManageSaleScreen } from '../screens/shared/ManageSaleScreen';

export { useAuth as useRole } from '../context/AuthContext';

// STACK NAVIGATORS
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// CUSTOM DRAWER CONTENT
const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { role, user, logout, setRole } = useAuth();
  const { openPanel } = usePanel();
  const { navigation } = props;

  const userName = user?.displayName || user?.username || 'Usuario';
  const userEmail = user?.email || '';
  const userAvatar = getImageUrl(user?.provider?.logoImage?.cdnUrl || null);
  const hasProvider = !!user?.provider;

  const handleSwitchRole = () => {
    if (role === 'provider') {
      setRole('client');
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
            <View style={styles.ratingBadge}>
              <Icon name="Star" size={10} color={TOKENS.colors.starActive} />
              <Text style={styles.ratingBadgeText}>5.0</Text>
            </View>
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
            <View style={styles.ratingBadge}>
              <Icon name="Star" size={10} color={TOKENS.colors.starActive} />
              <Text style={styles.ratingBadgeText}>4.9</Text>
            </View>
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
            <TouchableOpacity style={styles.drawerItem} onPress={() => openPanel('provider_dashboard')}>
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
        {hasProvider && (
          <TouchableOpacity style={styles.drawerItemSwitch} onPress={handleSwitchRole}>
            <Icon name="Shuffle" size={16} color={TOKENS.colors.brand600} />
            <Text style={styles.drawerItemSwitchText}>
              {role === 'provider' ? 'Cambiar a Modo Cliente' : 'Cambiar a Modo Profesional'}
            </Text>
          </TouchableOpacity>
        )}
        {role === 'guest' ? (
          <View style={styles.guestFooterBtns}>
            <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login')} style={styles.guestBtn} />
            <Button title="Registrarme" variant="secondary" onPress={() => navigation.navigate('Register')} style={[styles.guestBtn, { marginTop: 8 }]} />
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="LogOut" size={18} color={TOKENS.colors.textSubtle} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// DRAWER IMPLEMENTATION
const MainDrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: SCREEN_WIDTH * 0.78, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
      }}
    >
      <Drawer.Screen name="MainLayout" component={MainLayout} />
    </Drawer.Navigator>
  );
};

function PushNavigationTracker() {
  usePushNavigation();
  return null;
}

// MAIN ROUTING STACK
export const AppNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();
  const [currentRouteName, setCurrentRouteName] = useState('Splash');

  return (
    <PanelProvider>
      <NavigationContainer
          ref={navigationRef}
          onStateChange={() => {
            const route = navigationRef.getCurrentRoute() as any;
            if (route) {
              setCurrentRouteName(route.name);
            }
          }}
        >
          <PushNavigationTracker />
          <View style={{ flex: 1 }}>
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
              <Stack.Screen name="PublishJob" component={PublishJobScreen} />
              <Stack.Screen name="PublishProduct" component={PublishProductScreen} />
              <Stack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
              <Stack.Screen name="Billing" component={BillingScreen} />
              <Stack.Screen name="VerificationCenter" component={VerificationCenterScreen} />
              <Stack.Screen name="ReviewsList" component={ReviewsListScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="Shipping" component={ShippingScreen} />
              <Stack.Screen name="Purchase" component={PurchaseScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="ManageSale" component={ManageSaleScreen} />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
    </PanelProvider>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: TOKENS.colors.white },
  drawerHeaderGuest: { padding: TOKENS.spacing.lg, paddingTop: 56, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  guestAvatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: TOKENS.colors.surface200, alignItems: 'center', justifyContent: 'center', marginBottom: TOKENS.spacing.sm },
  drawerHeaderClient: { padding: TOKENS.spacing.lg, paddingTop: 56, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  drawerHeaderProvider: { padding: TOKENS.spacing.lg, paddingTop: 56, backgroundColor: TOKENS.colors.surface50, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
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
  drawerItemSwitch: { flexDirection: 'row', alignItems: 'center', padding: TOKENS.spacing.md, borderRadius: 12, gap: TOKENS.spacing.md, backgroundColor: TOKENS.colors.brand50, borderWidth: 1, borderColor: TOKENS.colors.brand200 },
  drawerItemSwitchText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand600 },
  drawerFooter: { padding: TOKENS.spacing.lg, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, backgroundColor: TOKENS.colors.white },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.spacing.sm, paddingVertical: 8, paddingHorizontal: TOKENS.spacing.sm },
  logoutText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  guestFooterBtns: { width: '100%' },
  guestBtn: { height: 44 },
});
