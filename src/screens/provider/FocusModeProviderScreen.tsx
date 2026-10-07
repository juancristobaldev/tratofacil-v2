import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS, DARK_VISIBLE_MAP_STYLE, MAP_BACKGROUND_COLOR } from '../../theme';
import { Icon, AnimatedUserMarker, HousePin, AnimatedPolyline, MapFloatingNavigationControls, DrivingNavigationHUD } from '../../components/ui';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useMapSheetCollapse } from '../../bottom-sheet/core/useMapSheetCollapse';
import { useMapCamera } from '../../hooks/useMapCamera';
import { FocusChatOverlay } from '../client/components/FocusChatOverlay';
import { useBottomNavHeight } from '../../components/layout/bottomNavMetrics';
import type { RouteCoordinate } from '../../utils/directions';
import { useLocation } from '../../context/LocationContext';
import { DEFAULT_TEMUCO_PLC_REGION } from '../../utils/mapGeometry';
import { canUseProviderNavigation } from '../../utils/orderStatus';
import { useProviderAutoNavigation } from '../../hooks/useProviderAutoNavigation';
import { analyzeRouteProgress } from '../../navigation-engine/routeAnalyzer';
import { DevJoystickOverlay } from '../../dev/joystick';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FocusModeProviderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const headerBottom = 60 + insets.top;
  const bottomNavHeight = useBottomNavHeight();
  const { sheetMetrics, setIndex, active } = useBottomSheet();
  const session = useFocusSession('provider');
  const {
    activeOrder,
    orderState,
    providerCoords,
    clientCoords,
    routeCoords,
    showChat,
    setShowChat,
    realtime,
    distanceLabel,
    etaLabel,
  } = session;

  const canUseNavigation = useMemo(() => {
    return canUseProviderNavigation({
      role: 'provider',
      isFocusModeProviderActive: true,
      activeOrder,
      orderState,
    });
  }, [activeOrder, orderState]);

  const polylineCoords = routeCoords;
  const mapStyle = DARK_VISIBLE_MAP_STYLE;
  const mapRef = useRef<MapView>(null);

  const {
    handleMapPanDrag: onSheetAutoCollapsePanDrag,
    handleMapRegionChangeComplete: onSheetAutoCollapseRegionComplete,
  } = useMapSheetCollapse({
    activeSheet: active,
    sheetIndex: sheetMetrics?.index ?? 1,
    isCollapsed: sheetMetrics?.isCollapsed ?? false,
    setIndex,
  });

  const {
    fitToRoute,
    followCoordinate,
    handlePanDrag,
    handleRegionChangeComplete,
    dynamicEdgePadding,
    isFollowing,
    isNavigating,
    navigationPosition,
    activeNavigationTarget,
    isUserExploring,
    navigateToCoordinate,
    exitNavigationMode,
    toggleNavigationMode,
    restoreNavigationCamera,
    fitToDefaultRegion,
  } = useMapCamera({
    mapRef,
    headerBottom,
    sheetTop: sheetMetrics?.sheetTop ?? null,
    bottomNavHeight,
  });

  const initialCenterRegion: Region = useMemo(() => {
    const lat = providerCoords?.latitude ?? clientCoords?.latitude ?? DEFAULT_TEMUCO_PLC_REGION.latitude;
    const lng = providerCoords?.longitude ?? clientCoords?.longitude ?? DEFAULT_TEMUCO_PLC_REGION.longitude;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: DEFAULT_TEMUCO_PLC_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_TEMUCO_PLC_REGION.longitudeDelta,
    };
  }, [clientCoords?.latitude, clientCoords?.longitude, providerCoords?.latitude, providerCoords?.longitude]);

  const localGpsCoords = useMemo<RouteCoordinate | null>(() => {
    const lat = location?.coords?.latitude;
    const lng = location?.coords?.longitude;
    return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitude: lat, longitude: lng }
      : null;
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const navigationSubjectCoordinate = localGpsCoords || providerCoords || null;

  const fallbackTurn = useMemo(() => {
    if (activeNavigationTarget?.turn) return activeNavigationTarget.turn;
    if (navigationSubjectCoordinate && routeCoords.length >= 2) {
      const res = analyzeRouteProgress(
        navigationSubjectCoordinate,
        routeCoords,
        location?.coords?.speed ?? 10,
      );
      return res?.turn ?? null;
    }
    return null;
  }, [activeNavigationTarget?.turn, navigationSubjectCoordinate, routeCoords, location?.coords?.speed]);

  // Enrutamiento y encuadre inicial cuando no está en navegación activa ni disponible
  useEffect(() => {
    if (canUseNavigation || isNavigating) return;

    if (routeCoords.length >= 2) {
      const points: RouteCoordinate[] = [
        providerCoords ? { latitude: providerCoords.latitude, longitude: providerCoords.longitude } : null,
        clientCoords ? { latitude: clientCoords.latitude, longitude: clientCoords.longitude } : null,
        ...routeCoords,
      ].filter(Boolean) as RouteCoordinate[];
      fitToRoute(points, { reason: 'focus_provider_route_fit' });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (providerCoords && clientCoords) {
      timer = setTimeout(() => {
        fitToRoute(
          [
            { latitude: providerCoords.latitude, longitude: providerCoords.longitude },
            { latitude: clientCoords.latitude, longitude: clientCoords.longitude },
          ],
          { reason: 'focus_provider_pins_fit_fallback' },
        );
      }, 350);
    } else if (providerCoords && !isUserExploring) {
      followCoordinate(providerCoords, { reason: 'focus_provider_self_follow' });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    canUseNavigation,
    isNavigating,
    orderState,
    routeCoords,
    clientCoords?.latitude,
    clientCoords?.longitude,
    providerCoords?.latitude,
    providerCoords?.longitude,
    fitToRoute,
    followCoordinate,
    isUserExploring,
  ]);

  // Seguimiento continuo del stream GPS cuando el usuario no está explorando libremente
  useEffect(() => {
    const followTarget = localGpsCoords || providerCoords;
    if (followTarget && !isUserExploring) {
      const heading =
        location?.coords?.heading != null &&
        Number.isFinite(location.coords.heading) &&
        location.coords.heading >= 0
          ? location.coords.heading
          : undefined;

      followCoordinate(followTarget, {
        animated: true,
        heading,
        speed: location?.coords?.speed ?? undefined,
        accuracy: location?.coords?.accuracy ?? undefined,
        timestamp: location?.timestamp,
        routeCoords: isNavigating && routeCoords.length >= 2 ? routeCoords : undefined,
        reason: isNavigating ? 'focus_provider_nav_follow' : 'focus_provider_gps_follow',
      });
    }
  }, [
    localGpsCoords,
    providerCoords?.latitude,
    providerCoords?.longitude,
    location?.coords?.heading,
    location?.coords?.speed,
    location?.coords?.accuracy,
    location?.timestamp,
    routeCoords,
    isUserExploring,
    isNavigating,
    followCoordinate,
  ]);

  // Si la orden pasa a estado terminal o se cancela, salir inmediatamente de navegación
  useEffect(() => {
    if (!canUseNavigation && isNavigating) {
      if (__DEV__) {
        console.log('[NAV:TERMINAL_EXIT] Order transitioned to terminal or inactive state; stopping 3D navigation');
      }
      exitNavigationMode(localGpsCoords || providerCoords, true);
    }
  }, [canUseNavigation, isNavigating, localGpsCoords, providerCoords, exitNavigationMode]);

  // Coordinador de navegación automática para el proveedor:
  // - Se activa solo sin ningún botón en estados disponibles
  // - Al arrastrar se desactiva
  // - Tras 15 seg o si el proveedor se mueve se activa automáticamente
  const {
    handlePanDrag: onAutoNavPanDrag,
    notifyUserGesture,
    handleRecenter: onAutoNavRecenter,
  } = useProviderAutoNavigation({
    enabled: canUseNavigation,
    providerCoord: navigationSubjectCoordinate,
    routeCoords,
    heading: location?.coords?.heading,
    speed: location?.coords?.speed,
    accuracy: location?.coords?.accuracy,
    timestamp: location?.timestamp,
    isNavigating,
    isUserExploring,
    toggleNavigationMode,
    navigateToCoordinate,
    exitNavigationMode,
  });

  // Limpieza al desmontar FocusModeProviderScreen: destruir sesión de navegación
  useEffect(() => {
    return () => {
      if (isNavigating) {
        exitNavigationMode(null, false);
      }
    };
  }, [isNavigating, exitNavigationMode]);

  const handleSmartFraming = useCallback(() => {
    if (routeCoords.length >= 2) {
      const points: RouteCoordinate[] = [
        providerCoords ? { latitude: providerCoords.latitude, longitude: providerCoords.longitude } : null,
        clientCoords ? { latitude: clientCoords.latitude, longitude: clientCoords.longitude } : null,
        ...routeCoords,
      ].filter(Boolean) as RouteCoordinate[];
      fitToRoute(points, { force: true, animated: true, reason: 'smart_framing_realtime_order' });
      onAutoNavPanDrag();
      return;
    }
    if (providerCoords && clientCoords) {
      fitToRoute(
        [
          { latitude: providerCoords.latitude, longitude: providerCoords.longitude },
          { latitude: clientCoords.latitude, longitude: clientCoords.longitude },
        ],
        { force: true, animated: true, reason: 'smart_framing_realtime_order' },
      );
      onAutoNavPanDrag();
      return;
    }
    if (canUseNavigation) {
      onAutoNavRecenter();
    } else {
      fitToDefaultRegion(DEFAULT_TEMUCO_PLC_REGION, true);
    }
  }, [routeCoords, providerCoords, clientCoords, fitToRoute, onAutoNavPanDrag, canUseNavigation, onAutoNavRecenter, fitToDefaultRegion]);

  const handleFollow = useCallback(() => {
    if (canUseNavigation) {
      onAutoNavRecenter();
      return;
    }
    if (routeCoords.length >= 2) {
      const points: RouteCoordinate[] = [
        providerCoords ? { latitude: providerCoords.latitude, longitude: providerCoords.longitude } : null,
        clientCoords ? { latitude: clientCoords.latitude, longitude: clientCoords.longitude } : null,
        ...routeCoords,
      ].filter(Boolean) as RouteCoordinate[];
      fitToRoute(points, { force: true, animated: true, reason: 'smart_framing_realtime_order' });
      return;
    }
    if (providerCoords && clientCoords) {
      fitToRoute(
        [
          { latitude: providerCoords.latitude, longitude: providerCoords.longitude },
          { latitude: clientCoords.latitude, longitude: clientCoords.longitude },
        ],
        { force: true, animated: true, reason: 'smart_framing_realtime_order' },
      );
    } else if (localGpsCoords || providerCoords) {
      const targetCoord = localGpsCoords || providerCoords;
      followCoordinate(targetCoord, {
        force: true,
        animated: true,
        latitudeDelta: DEFAULT_TEMUCO_PLC_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_TEMUCO_PLC_REGION.longitudeDelta,
        reason: 'smart_framing_metropolitan_user_recenter',
      });
    } else if (clientCoords) {
      followCoordinate(clientCoords, {
        force: true,
        animated: true,
        reason: 'smart_framing_metropolitan_user_recenter',
      });
    } else {
      fitToDefaultRegion(DEFAULT_TEMUCO_PLC_REGION, true);
    }
  }, [
    canUseNavigation,
    onAutoNavRecenter,
    routeCoords,
    providerCoords,
    clientCoords,
    fitToRoute,
    localGpsCoords,
    followCoordinate,
    fitToDefaultRegion,
  ]);

  const [mapLatitudeDelta, setMapLatitudeDelta] = useState<number>(0.003);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          testID="provider-map-view"
          style={styles.map}
          initialRegion={initialCenterRegion}
          onPanDrag={() => {
            handlePanDrag();
            onAutoNavPanDrag();
            onSheetAutoCollapsePanDrag();
          }}
          onRegionChangeComplete={(r, d) => {
            handleRegionChangeComplete(r, d);
            onSheetAutoCollapseRegionComplete();
            if (d?.isGesture) {
              notifyUserGesture();
            }
            if (r?.latitudeDelta && Number.isFinite(r.latitudeDelta) && r.latitudeDelta > 0) {
              setMapLatitudeDelta(r.latitudeDelta);
            }
          }}
          customMapStyle={mapStyle}
          userInterfaceStyle="dark"
          loadingBackgroundColor={MAP_BACKGROUND_COLOR}
          loadingEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {clientCoords && Math.abs(clientCoords.latitude) > 1e-4 && <HousePin coordinate={clientCoords} />}

          {(localGpsCoords || providerCoords) && Math.abs((localGpsCoords || providerCoords)!.latitude) > 1e-4 && (
            <AnimatedUserMarker
              coordinate={(localGpsCoords || providerCoords)!}
              heading={(isNavigating && activeNavigationTarget?.heading != null) ? activeNavigationTarget.heading : location?.coords?.heading}
              onPress={() => {
                if (canUseNavigation) {
                  onAutoNavRecenter();
                } else {
                  handleFollow();
                }
              }}
            />
          )}

          {orderState === 'EN_CAMINO' && polylineCoords.length >= 2 && (
            <AnimatedPolyline
              coordinates={polylineCoords}
              currentPosition={localGpsCoords || providerCoords}
              strokeColor={TOKENS.colors.brand500}
              latitudeDelta={mapLatitudeDelta}
            />
          )}
        </MapView>

        {/* Driving Navigation HUD for Provider: 25px bajo el header (Persistente en EN_CAMINO) */}
        {canUseNavigation && orderState === 'EN_CAMINO' && (
          <DrivingNavigationHUD
            turn={activeNavigationTarget?.turn ?? fallbackTurn}
            etaLabel={etaLabel}
            distanceLabel={distanceLabel}
            destinationAddress={activeOrder?.clientAddress}
            clientName={activeOrder?.client?.displayName}
            style={{
              position: 'absolute',
              top: 25,
              left: 0,
              right: 0,
              zIndex: 60,
            }}
          />
        )}

        {/* Top Floating Controls */}
        <MapFloatingNavigationControls
          isNavigating={isNavigating}
          subjectCoordinate={navigationSubjectCoordinate}
          destinationCoordinate={clientCoords}
          targetCoordinate={navigationSubjectCoordinate}
          heading={location?.coords?.heading}
          onSmartFraming={handleSmartFraming}
          showSmartFraming={false}
          showNavigation={false}
          style={[
            styles.floatingControls,
            { top: insets.top > 0 ? insets.top + 8 : TOKENS.spacing.md },
          ]}
        />

        {!isFollowing && (
          <TouchableOpacity onPress={handleFollow} style={styles.followBtn}>
            <Icon name="Locate" size={18} color={TOKENS.colors.brand500} />
            <Text style={styles.followBtnText}>Centrar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* CHAT OVERLAY */}
      {showChat && (
        <FocusChatOverlay
          chatUser={activeOrder?.client}
          activeOrder={activeOrder}
          realtime={realtime}
          role="provider"
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Dev Street Navigation Joystick */}
      {__DEV__ && (
        <DevJoystickOverlay
          onFollowCoordinate={followCoordinate}
          routeCoords={routeCoords}
          bottomOffset={
            sheetMetrics?.sheetHeight
              ? bottomNavHeight + sheetMetrics.sheetHeight + 12
              : bottomNavHeight + 16
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_BACKGROUND_COLOR,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: MAP_BACKGROUND_COLOR,
  },
  map: {
    ...StyleSheet.absoluteFill,
    backgroundColor: MAP_BACKGROUND_COLOR,
  },
  sheetBody: {
    flex: 1,
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  etaText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 16,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  clientCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientAddress: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  guideText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  bypassBtn: {
    paddingVertical: TOKENS.spacing.xs,
    alignItems: 'center',
  },
  bypassBtnText: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  actionBtn: {
    width: '100%',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.xs,
  },
  timerLabel: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: TOKENS.typography.weights.bold,
  },
  timerVal: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginTop: 4,
  },
  workingDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
    lineHeight: 16,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
    gap: 8,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  completedTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginTop: 4,
  },
  completedSub: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  clientMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.dark900,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  providerMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.brand500,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
  },
  followBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  followBtnText: {
    color: TOKENS.colors.brand500,
    fontSize: 13,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    right: TOKENS.spacing.md,
    zIndex: 1000,
    elevation: 1000,
  },
});
