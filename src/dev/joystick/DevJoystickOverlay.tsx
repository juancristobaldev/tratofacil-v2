import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import {
  isDevJoystickEnabled,
  getDevJoystickConfig,
  setDevJoystickConfig,
  subscribeDevJoystickConfig,
  cycleDevJoystickSpeed,
  toggleDevJoystickAutoNav,
  toggleDevJoystickRouteSnap,
  DEV_JOYSTICK_SPEED_PRESETS,
} from './devFlags';
import { DevJoystickStick } from './DevJoystickStick';
import { DevJoystickTelemetry } from './DevJoystickTelemetry';
import { locationSimulator } from './locationSimulator';
import type { RouteCoordinate } from '../../utils/directions';
import { Icon } from '../../components/ui/Icon';
import { useFocusSession } from '../../features/focus-session/useFocusSession';

interface DevJoystickOverlayProps {
  onFollowCoordinate?: (coord: RouteCoordinate, options?: any) => void;
  bottomOffset?: number; // Desplazamiento desde el fondo para evitar bottom nav / sheet
  routeCoords?: RouteCoordinate[] | null;
}

export const DevJoystickOverlay: React.FC<DevJoystickOverlayProps> = ({
  onFollowCoordinate,
  bottomOffset = 90,
  routeCoords,
}) => {
  if (!__DEV__ || !isDevJoystickEnabled()) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [speedKmh, setSpeedKmh] = useState<number>(getDevJoystickConfig().speedKmh);
  const [isAutoNav, setIsAutoNav] = useState<boolean>(getDevJoystickConfig().autoNav);
  const [isRouteSnap, setIsRouteSnap] = useState<boolean>(getDevJoystickConfig().routeSnapMode);
  const [hasRoute, setHasRoute] = useState<boolean>(locationSimulator.hasActiveRoute());

  // Conexión automática con la sesión de foco para extraer la polyline activa de la orden
  let focusSession: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    focusSession = useFocusSession();
  } catch {
    // Seguro ante renderizado fuera de FocusSessionProvider
  }

  const activeRouteCoords: RouteCoordinate[] | null =
    routeCoords && routeCoords.length >= 2
      ? routeCoords
      : focusSession?.provider?.routeCoords?.length >= 2
        ? focusSession.provider.routeCoords
        : focusSession?.client?.routeCoords?.length >= 2
          ? focusSession.client.routeCoords
          : null;

  // Sincronizar polyline con LocationSimulator
  useEffect(() => {
    locationSimulator.setRouteCoords(activeRouteCoords);
    setHasRoute(locationSimulator.hasActiveRoute());
  }, [activeRouteCoords]);

  useEffect(() => {
    const controller = locationSimulator.getMovementController();
    const unsubscribeMovement = controller.subscribe(payload => {
      const config = getDevJoystickConfig();
      if (config.followCamera && onFollowCoordinate && payload.isMoving) {
        onFollowCoordinate(payload.position, {
          heading: payload.heading,
          speed: (payload.speedKmh * 1000) / 3600,
          routeCoords: activeRouteCoords ?? undefined,
          source: 'LOCAL_GPS',
        });
      }
      setHasRoute(locationSimulator.hasActiveRoute());
    });

    const unsubscribeConfig = subscribeDevJoystickConfig(newConfig => {
      setSpeedKmh(newConfig.speedKmh);
      setIsAutoNav(newConfig.autoNav);
      setIsRouteSnap(newConfig.routeSnapMode);
    });

    return () => {
      unsubscribeMovement();
      unsubscribeConfig();
    };
  }, [onFollowCoordinate, activeRouteCoords]);

  const handleRecenter = () => {
    const currentPos = locationSimulator.getCurrentPosition();
    if (currentPos?.coords && onFollowCoordinate) {
      onFollowCoordinate({
        latitude: currentPos.coords.latitude,
        longitude: currentPos.coords.longitude,
      }, {
        heading: currentPos.coords.heading,
        routeCoords: activeRouteCoords ?? undefined,
        source: 'LOCAL_GPS',
      });
    }
  };

  const handleCycleSpeed = () => {
    cycleDevJoystickSpeed();
  };

  const handleToggleAutoNav = () => {
    locationSimulator.toggleAutoNav();
  };

  const handleStickInput = () => {
    if (isAutoNav) {
      locationSimulator.stopAutoNav();
    }
  };

  const activePreset = DEV_JOYSTICK_SPEED_PRESETS.find(p => p.kmh === speedKmh);

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      {/* Barra superior de controles tipo cápsula aeroespacial */}
      <View style={styles.topControlRow} pointerEvents="box-none">
        {isExpanded && (
          <>
            {/* Botón Auto-Nav rápido si hay polyline activa */}
            {hasRoute && (
              <TouchableOpacity
                style={[styles.autoNavPill, isAutoNav && styles.autoNavPillActive]}
                onPress={handleToggleAutoNav}
                activeOpacity={0.8}
              >
                <Icon
                  name={isAutoNav ? 'Pause' : 'Play'}
                  size={10}
                  color={isAutoNav ? '#38bdf8' : '#e2e8f0'}
                />
                <Text style={[styles.autoNavText, isAutoNav && styles.autoNavTextActive]}>
                  {isAutoNav ? 'AUTO ON' : 'AUTO-NAV'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Conmutador de Telemetría HUD */}
            <TouchableOpacity
              style={[styles.hudTogglePill, showTelemetry && styles.hudTogglePillActive]}
              onPress={() => setShowTelemetry(!showTelemetry)}
              activeOpacity={0.8}
            >
              <Icon
                name="Activity"
                size={12}
                color={showTelemetry ? '#38bdf8' : '#94a3b8'}
              />
              <Text style={[styles.hudToggleText, showTelemetry && styles.hudToggleTextActive]}>
                {showTelemetry ? 'HUD ON' : 'HUD'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Botón maestro de expansión y badge de velocidad */}
        <TouchableOpacity
          style={styles.masterPill}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.masterPillContent}>
            <Text style={styles.masterPillEmoji}>🕹️</Text>
            <Text style={styles.masterPillText}>PILOT</Text>
            <View style={styles.masterSpeedBadge}>
              <Icon name="Zap" size={10} color="#38bdf8" />
              <Text style={styles.masterSpeedText}>{speedKmh}k</Text>
            </View>
            <Icon
              name={isExpanded ? 'ChevronDown' : 'ChevronUp'}
              size={14}
              color="#94a3b8"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Área expandida de pilotaje */}
      {isExpanded && (
        <View style={styles.contentRow} pointerEvents="box-none">
          {/* Panel de instrumentos HUD a la izquierda */}
          {showTelemetry && (
            <View style={styles.telemetryWrapper}>
              <DevJoystickTelemetry
                onRecenterCamera={handleRecenter}
                onClose={() => setShowTelemetry(false)}
              />
            </View>
          )}

          {/* Stick de navegación y selector de velocidades táctil al alcance del pulgar */}
          <View style={styles.stickWrapper}>
            {/* Dock de Velocidad integrado */}
            <View style={styles.speedDockContainer}>
              <View style={styles.speedDockBar}>
                {DEV_JOYSTICK_SPEED_PRESETS.map(preset => {
                  const isActive = speedKmh === preset.kmh;
                  return (
                    <TouchableOpacity
                      key={preset.kmh}
                      style={[styles.speedDockBtn, isActive && styles.speedDockBtnActive]}
                      onPress={() => setDevJoystickConfig({ speedKmh: preset.kmh })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.speedDockBtnText,
                          isActive && styles.speedDockBtnTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Botón de Auto-Nav o indicador de velocidad / estado de ruta */}
              <View style={styles.dockFooterRow}>
                {hasRoute ? (
                  <TouchableOpacity
                    style={[styles.autoNavDockBtn, isAutoNav && styles.autoNavDockBtnActive]}
                    onPress={handleToggleAutoNav}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={isAutoNav ? 'Pause' : 'Play'}
                      size={10}
                      color={isAutoNav ? '#38bdf8' : '#e2e8f0'}
                    />
                    <Text
                      style={[styles.autoNavDockText, isAutoNav && styles.autoNavDockTextActive]}
                    >
                      {isAutoNav ? 'Pausar Auto' : 'Seguir Polyline'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.speedActiveBadge}
                    onPress={handleCycleSpeed}
                    activeOpacity={0.7}
                  >
                    <Icon name="Zap" size={11} color="#38bdf8" />
                    <Text style={styles.speedActiveText}>
                      {speedKmh}k • {activePreset?.name ?? 'Libre'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Gimbal del Joystick */}
            <DevJoystickStick
              size={116}
              stickSize={48}
              onVectorChange={handleStickInput}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  autoNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 18, 38, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  autoNavPillActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.6,
  },
  autoNavText: {
    color: '#e2e8f0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  autoNavTextActive: {
    color: '#38bdf8',
  },
  hudTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 18, 38, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hudTogglePillActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
  },
  hudToggleText: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hudToggleTextActive: {
    color: '#38bdf8',
  },
  masterPill: {
    backgroundColor: 'rgba(10, 18, 38, 0.94)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  masterPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  masterPillEmoji: {
    fontSize: 12,
  },
  masterPillText: {
    color: '#f8fafc',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  masterSpeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  masterSpeedText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  telemetryWrapper: {
    marginBottom: 2,
  },
  stickWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedDockContainer: {
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(10, 18, 38, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  speedDockBar: {
    flexDirection: 'row',
    gap: 2,
  },
  speedDockBtn: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  speedDockBtnActive: {
    backgroundColor: '#0284c7',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  speedDockBtnText: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '700',
  },
  speedDockBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dockFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  autoNavDockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  autoNavDockBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.35)',
    borderWidth: 0.5,
    borderColor: '#38bdf8',
  },
  autoNavDockText: {
    color: '#cbd5e1',
    fontSize: 8.5,
    fontWeight: '700',
  },
  autoNavDockTextActive: {
    color: '#38bdf8',
  },
  speedActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  speedActiveText: {
    color: '#7dd3fc',
    fontSize: 8.5,
    fontWeight: '700',
  },
});
