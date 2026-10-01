import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  type StyleProp,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Avatar } from './Avatar';

export interface ClientArrivalHUDProps {
  /** Nombre del proveedor o profesional */
  providerName: string;
  /** Avatar / URL de la imagen del profesional */
  providerAvatar?: string | null;
  /** Calificación promedio del profesional (ej. 4.9) */
  providerRating?: number | null;
  /** Tipo de vehículo o descripción del servicio (opcional) */
  vehicleInfo?: string | null;
  /** Minutos estimados de llegada (ej. "7 min" o 7) */
  etaMinutes?: number | string | null;
  /** Distancia restante legible (ej. "1.8 km") */
  distanceRemaining?: string | null;
  /** Fracción de avance de la ruta completada (0.0 a 1.0) para la barra de progreso */
  routeProgressFraction?: number | null;
  /** Callback para notificar cambios de tamaño / layout del componente */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Estilo opcional para el contenedor exterior */
  style?: StyleProp<ViewStyle>;
  /** TestID para pruebas automatizadas */
  testID?: string;
}

export const ClientArrivalHUD: React.FC<ClientArrivalHUDProps> = memo(({
  providerName,
  providerAvatar,
  providerRating,
  vehicleInfo,
  etaMinutes,
  distanceRemaining,
  routeProgressFraction = 0,
  onLayout,
  style,
  testID = 'client-arrival-hud',
}) => {
  const eta = etaMinutes != null && etaMinutes !== '' ? etaMinutes : '...';
  const dist = distanceRemaining || '';
  const progressPercent = Math.min(100, Math.max(0, (routeProgressFraction ?? 0) * 100));

  const formattedEta =
    typeof eta === 'number'
      ? `~${eta} min`
      : typeof eta === 'string' && eta.includes('min')
        ? eta.startsWith('~')
          ? eta
          : `~${eta}`
        : typeof eta === 'string' && eta !== '...'
          ? `~${eta}`
          : eta;

  return (
    <View
      style={[styles.container, style]}
      pointerEvents="box-none"
      testID={testID}
      onLayout={onLayout}
    >
      <View style={styles.card}>
        {/* Left: Avatar con Baliza Verde Viva de Movimiento */}
        <View style={styles.avatarBox} testID="hud-client-avatar-box">
          <Avatar
            uri={providerAvatar}
            name={providerName}
            size={42}
          />
          <View style={styles.livePulseDot} testID="live-pulse-dot" />
        </View>

        {/* Center: Nombre del Profesional, Rating y Estado */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.providerNameText} numberOfLines={1}>
              {providerName}
            </Text>
            {providerRating != null && providerRating > 0 && (
              <View style={styles.ratingBadge} testID="hud-client-rating-badge">
                <Icon name="Star" size={12} color="#FBBF24" />
                <Text style={styles.ratingText}>{providerRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtext} numberOfLines={1}>
            {vehicleInfo ? `${vehicleInfo} • ` : ''}En camino a tu domicilio
          </Text>
        </View>

        {/* Right: Telemetría Pura (Tiempo Estimado y Distancia) */}
        {(etaMinutes != null || distanceRemaining) && (
          <View style={styles.etaCol} testID="hud-client-telemetrics-col">
            <Text style={styles.etaValue} numberOfLines={1}>
              {formattedEta}
            </Text>
            {dist ? (
              <Text style={styles.distanceValue} numberOfLines={1}>
                {dist}
              </Text>
            ) : null}
          </View>
        )}

        {/* Bottom Route Progress Track */}
        <View style={styles.progressTrack} testID="hud-progress-track">
          <View
            style={[styles.progressBar, { width: `${progressPercent}%` }]}
            testID="hud-progress-bar"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: TOKENS.spacing.md,
    zIndex: 60,
    elevation: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 22, 0.94)',
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    position: 'relative',
    ...TOKENS.shadows.floating,
  },
  avatarBox: {
    position: 'relative',
    marginRight: 10,
  },
  livePulseDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#121216',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerNameText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.white,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#FBBF24',
  },
  subtext: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  etaCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.10)',
    minWidth: 70,
  },
  etaValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.white,
  },
  distanceValue: {
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.brand200,
    marginTop: 1,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: TOKENS.colors.brand500,
  },
});
