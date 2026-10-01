import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { locationSimulator } from './locationSimulator';
import {
  getDevJoystickConfig,
  setDevJoystickConfig,
  subscribeDevJoystickConfig,
  stepDevJoystickSpeed,
  toggleDevJoystickAutoNav,
  toggleDevJoystickRouteSnap,
  DEV_JOYSTICK_SPEED_PRESETS,
  type DevJoystickConfig,
} from './devFlags';
import type { MovementUpdatePayload } from './movementController';
import { Icon } from '../../components/ui/Icon';

interface DevJoystickTelemetryProps {
  onRecenterCamera?: () => void;
  onClose?: () => void;
}

export const DevJoystickTelemetry: React.FC<DevJoystickTelemetryProps> = ({
  onRecenterCamera,
  onClose,
}) => {
  const [config, setConfig] = useState<DevJoystickConfig>(getDevJoystickConfig());
  const [telemetry, setTelemetry] = useState<MovementUpdatePayload>({
    position: locationSimulator.getMovementController().getPosition(),
    heading: locationSimulator.getMovementController().getHeading(),
    speedKmh: locationSimulator.getMovementController().getSpeedKmh(),
    isSnapped: false,
    isMoving: false,
  });
  const [isSimulated, setIsSimulated] = useState<boolean>(locationSimulator.isSimulating());

  useEffect(() => {
    const controller = locationSimulator.getMovementController();
    const unsubscribeMovement = controller.subscribe(payload => {
      setTelemetry(payload);
    });

    const unsubscribeSim = locationSimulator.subscribe(() => {
      setIsSimulated(locationSimulator.isSimulating());
    });

    const unsubscribeConfig = subscribeDevJoystickConfig(newConfig => {
      setConfig(newConfig);
    });

    return () => {
      unsubscribeMovement();
      unsubscribeSim();
      unsubscribeConfig();
    };
  }, []);

  const handleToggleStreet = () => {
    const next = !config.streetSnapMode;
    setDevJoystickConfig({ streetSnapMode: next });
    setConfig(getDevJoystickConfig());
  };

  const handleToggleRouteSnap = () => {
    toggleDevJoystickRouteSnap();
    setConfig(getDevJoystickConfig());
  };

  const handleToggleAutoNav = () => {
    locationSimulator.toggleAutoNav();
    setConfig(getDevJoystickConfig());
  };

  const handleToggleFollow = () => {
    const next = !config.followCamera;
    setDevJoystickConfig({ followCamera: next });
    setConfig(getDevJoystickConfig());
    if (next && onRecenterCamera) {
      onRecenterCamera();
    }
  };

  const handleResetRealGps = () => {
    locationSimulator.disableSimulation();
    setIsSimulated(false);
    if (onRecenterCamera) {
      onRecenterCamera();
    }
  };

  const handleSetSpeed = (kmh: number) => {
    setDevJoystickConfig({ speedKmh: kmh });
    setConfig(getDevJoystickConfig());
  };

  const hasRoute = locationSimulator.hasActiveRoute();
  const polyNav = locationSimulator.getMovementController().getPolylineNavigator();
  const routeProgressFraction = hasRoute ? polyNav.getProgressFraction() : 0;
  const routeRemainingMeters = hasRoute ? polyNav.getRemainingDistance() : 0;
  const routeTotalMeters = hasRoute ? polyNav.getTotalDistance() : 0;
  const isAutoNav = config.autoNav;

  const compassInfo = getCompassInfo(telemetry.heading);
  const activePreset = DEV_JOYSTICK_SPEED_PRESETS.find(p => p.kmh === config.speedKmh);
  const throttlePercent = Math.min(100, Math.round((telemetry.speedKmh / Math.max(1, config.speedKmh)) * 100));

  return (
    <View style={styles.container}>
      {/* Barra superior de estado y cierre */}
      <View style={styles.headerRow}>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isSimulated ? '#06b6d4' : '#22c55e' },
            ]}
          />
          <Text style={styles.statusText}>
            {isSimulated ? 'GPS SIMULADO' : 'GPS REAL'}
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          {hasRoute && (
            <View style={[styles.modeBadge, isAutoNav ? styles.modeBadgeAutoNav : styles.modeBadgeRoute]}>
              <Text style={[styles.modeBadgeText, isAutoNav ? styles.modeBadgeTextAutoNav : styles.modeBadgeTextRoute]}>
                {isAutoNav ? '⚡ AUTO-NAV' : '🛣️ RUTA'}
              </Text>
            </View>
          )}
          <View style={[styles.modeBadge, telemetry.isSnapped && styles.modeBadgeSnapped]}>
            <Text style={[styles.modeBadgeText, telemetry.isSnapped && styles.modeBadgeTextSnapped]}>
              {telemetry.isSnapped ? 'RED VIAL' : 'LIBRE'}
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Icon name="X" size={13} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tarjeta de Navegación por Polyline (si hay ruta activa) */}
      {hasRoute && (
        <View style={styles.routeCard}>
          <View style={styles.routeHeaderRow}>
            <View style={styles.routeHeaderLeft}>
              <Icon name="Navigation" size={11} color={isAutoNav ? '#38bdf8' : '#a78bfa'} />
              <Text style={styles.routeHeaderTitle}>
                {isAutoNav ? 'AUTONAVEGACIÓN ACTIVA' : 'SEGUIMIENTO DE RUTA'}
              </Text>
            </View>
            <Text style={styles.routeProgressPercent}>
              {Math.round(routeProgressFraction * 100)}%
            </Text>
          </View>
          <View style={styles.routeProgressBarTrack}>
            <View
              style={[
                styles.routeProgressBarFill,
                { width: `${Math.round(routeProgressFraction * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.routeStatsRow}>
            <Text style={styles.routeStatsText}>
              Restan: {formatDistance(routeRemainingMeters)}
            </Text>
            <Text style={styles.routeStatsTotal}>
              Total: {formatDistance(routeTotalMeters)}
            </Text>
          </View>
        </View>
      )}

      {/* Panel de Instrumentos Principales */}
      <View style={styles.instrumentGrid}>
        {/* Instrumento Velocidad */}
        <View style={styles.instrumentCard}>
          <View style={styles.instrumentHeader}>
            <Icon name="Gauge" size={12} color="#38bdf8" />
            <Text style={styles.instrumentLabel}>VELOCIDAD</Text>
          </View>
          <View style={styles.speedReadoutRow}>
            <Text style={styles.speedNumber}>{telemetry.speedKmh.toFixed(1)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
          {/* Barra de aceleración en tiempo real */}
          <View style={styles.throttleBarTrack}>
            <View
              style={[
                styles.throttleBarFill,
                {
                  width: `${throttlePercent}%`,
                  backgroundColor: throttlePercent > 70 ? '#f59e0b' : '#38bdf8',
                },
              ]}
            />
          </View>
        </View>

        {/* Instrumento Rumbo y Brújula */}
        <View style={styles.instrumentCard}>
          <View style={styles.instrumentHeader}>
            <Icon name="Compass" size={12} color="#38bdf8" />
            <Text style={styles.instrumentLabel}>RUMBO</Text>
          </View>
          <View style={styles.headingReadoutRow}>
            <Text style={styles.headingNumber}>{Math.round(telemetry.heading)}°</Text>
            <Text style={styles.headingAbbr}>{compassInfo.abbr}</Text>
          </View>
          <Text style={styles.headingDescription}>{compassInfo.full}</Text>
        </View>
      </View>

      {/* Coordenadas e info de red */}
      <View style={styles.geoFooterRow}>
        <View style={styles.coordGroup}>
          <Icon name="MapPin" size={11} color="#64748b" />
          <Text style={styles.coordText}>
            {telemetry.position.latitude.toFixed(5)}, {telemetry.position.longitude.toFixed(5)}
          </Text>
        </View>
        <Text style={styles.cacheCountText}>
          {locationSimulator.getMovementController().getStreetEngine().getSegmentCount()} segs
        </Text>
      </View>

      {/* Botones de acción rápida de navegación */}
      <View style={styles.actionsRow}>
        {hasRoute && (
          <TouchableOpacity
            style={[styles.actionBtn, isAutoNav && styles.actionBtnAutoNavActive]}
            onPress={handleToggleAutoNav}
            activeOpacity={0.7}
          >
            <Icon
              name={isAutoNav ? 'Pause' : 'Play'}
              size={11}
              color={isAutoNav ? '#f59e0b' : '#38bdf8'}
            />
            <Text style={[styles.actionBtnText, isAutoNav && styles.actionBtnTextAutoNavActive]}>
              {isAutoNav ? 'Pausar' : 'Auto-Nav'}
            </Text>
          </TouchableOpacity>
        )}

        {hasRoute && (
          <TouchableOpacity
            style={[styles.actionBtn, config.routeSnapMode && styles.actionBtnActive]}
            onPress={handleToggleRouteSnap}
            activeOpacity={0.7}
          >
            <Icon
              name="GitCommit"
              size={11}
              color={config.routeSnapMode ? '#38bdf8' : '#94a3b8'}
            />
            <Text style={[styles.actionBtnText, config.routeSnapMode && styles.actionBtnTextActive]}>
              {config.routeSnapMode ? 'Ruta ON' : 'Ruta Off'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, config.streetSnapMode && styles.actionBtnActive]}
          onPress={handleToggleStreet}
          activeOpacity={0.7}
        >
          <Icon
            name="Navigation"
            size={11}
            color={config.streetSnapMode ? '#38bdf8' : '#94a3b8'}
          />
          <Text style={[styles.actionBtnText, config.streetSnapMode && styles.actionBtnTextActive]}>
            {config.streetSnapMode ? 'Calles' : 'Libre'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, config.followCamera && styles.actionBtnActive]}
          onPress={handleToggleFollow}
          activeOpacity={0.7}
        >
          <Icon
            name="Camera"
            size={11}
            color={config.followCamera ? '#38bdf8' : '#94a3b8'}
          />
          <Text style={[styles.actionBtnText, config.followCamera && styles.actionBtnTextActive]}>
            {config.followCamera ? 'Cámara' : 'Fija'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnReset}
          onPress={handleResetRealGps}
          activeOpacity={0.7}
        >
          <Icon name="RotateCcw" size={11} color="#fda4af" />
          <Text style={styles.actionBtnResetText}>GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de velocidad máxima */}
      <View style={styles.speedSection}>
        <View style={styles.speedHeaderRow}>
          <View style={styles.speedTitleGroup}>
            <Icon name="Zap" size={12} color="#38bdf8" />
            <Text style={styles.speedSectionTitle}>VELOCIDAD MÁX</Text>
          </View>
          <View style={styles.speedStepperContainer}>
            <TouchableOpacity
              style={styles.speedStepBtn}
              onPress={() => stepDevJoystickSpeed('down')}
              activeOpacity={0.7}
            >
              <Text style={styles.speedStepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.speedCurrentPill}>
              <Text style={styles.speedCurrentText}>
                {config.speedKmh}k • {activePreset?.name ?? 'Manual'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.speedStepBtn}
              onPress={() => stepDevJoystickSpeed('up')}
              activeOpacity={0.7}
            >
              <Text style={styles.speedStepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grilla 3x2 de presets con diseño táctil */}
        <View style={styles.speedGrid}>
          {DEV_JOYSTICK_SPEED_PRESETS.map(preset => {
            const isActive = config.speedKmh === preset.kmh;
            return (
              <TouchableOpacity
                key={preset.kmh}
                style={[
                  styles.speedGridBtn,
                  isActive && styles.speedGridBtnActive,
                ]}
                onPress={() => handleSetSpeed(preset.kmh)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.speedGridBtnLabel,
                    isActive && styles.speedGridBtnLabelActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.speedGridBtnName,
                    isActive && styles.speedGridBtnNameActive,
                  ]}
                >
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function getCompassInfo(bearing: number): { abbr: string; full: string } {
  const normalized = ((bearing % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return { abbr: 'N', full: 'Norte' };
  if (normalized >= 22.5 && normalized < 67.5) return { abbr: 'NE', full: 'Noreste' };
  if (normalized >= 67.5 && normalized < 112.5) return { abbr: 'E', full: 'Este' };
  if (normalized >= 112.5 && normalized < 157.5) return { abbr: 'SE', full: 'Sureste' };
  if (normalized >= 157.5 && normalized < 202.5) return { abbr: 'S', full: 'Sur' };
  if (normalized >= 202.5 && normalized < 247.5) return { abbr: 'SO', full: 'Suroeste' };
  if (normalized >= 247.5 && normalized < 292.5) return { abbr: 'O', full: 'Oeste' };
  return { abbr: 'NO', full: 'Noroeste' };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 18, 38, 0.94)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    padding: 10,
    width: 236,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeBadgeSnapped: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  modeBadgeRoute: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
  },
  modeBadgeAutoNav: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  modeBadgeText: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modeBadgeTextSnapped: {
    color: '#38bdf8',
  },
  modeBadgeTextRoute: {
    color: '#c084fc',
  },
  modeBadgeTextAutoNav: {
    color: '#fbbf24',
  },
  closeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    marginBottom: 6,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeHeaderTitle: {
    color: '#cbd5e1',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  routeProgressPercent: {
    color: '#38bdf8',
    fontSize: 8.5,
    fontWeight: '800',
  },
  routeProgressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 3,
  },
  routeProgressBarFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: '#38bdf8',
  },
  routeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeStatsText: {
    color: '#94a3b8',
    fontSize: 7.5,
    fontWeight: '600',
  },
  routeStatsTotal: {
    color: '#64748b',
    fontSize: 7.5,
    fontWeight: '500',
  },
  instrumentGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  instrumentCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  instrumentLabel: {
    color: '#94a3b8',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  speedReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  speedNumber: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '800',
  },
  speedUnit: {
    color: '#64748b',
    fontSize: 8.5,
    fontWeight: '600',
  },
  throttleBarTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
    overflow: 'hidden',
  },
  throttleBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  headingReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  headingNumber: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  headingAbbr: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  headingDescription: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '500',
    marginTop: 1,
  },
  geoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  coordGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coordText: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '500',
  },
  cacheCountText: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  actionBtnAutoNavActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '600',
  },
  actionBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  actionBtnTextAutoNavActive: {
    color: '#fbbf24',
    fontWeight: '700',
  },
  actionBtnReset: {
    flexDirection: 'row',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnResetText: {
    color: '#fda4af',
    fontSize: 8.5,
    fontWeight: '700',
  },
  speedSection: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  speedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  speedTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  speedSectionTitle: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  speedStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  speedStepBtn: {
    width: 20,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedStepBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  speedCurrentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  speedCurrentText: {
    color: '#38bdf8',
    fontSize: 8.5,
    fontWeight: '700',
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
  },
  speedGridBtn: {
    width: '31%',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  speedGridBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.45)',
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  speedGridBtnLabel: {
    color: '#cbd5e1',
    fontSize: 9.5,
    fontWeight: '700',
  },
  speedGridBtnLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  speedGridBtnName: {
    color: '#64748b',
    fontSize: 7.5,
    fontWeight: '600',
  },
  speedGridBtnNameActive: {
    color: '#bae6fd',
    fontWeight: '700',
  },
});
