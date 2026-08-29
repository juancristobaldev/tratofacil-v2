import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { isDevJoystickEnabled, getDevJoystickConfig } from './devFlags';
import { DevJoystickStick } from './DevJoystickStick';
import { DevJoystickTelemetry } from './DevJoystickTelemetry';
import { locationSimulator } from './locationSimulator';
import type { RouteCoordinate } from '../../utils/directions';

interface DevJoystickOverlayProps {
  onFollowCoordinate?: (coord: RouteCoordinate) => void;
  bottomOffset?: number; // Desplazamiento desde el fondo para evitar bottom nav / sheet
}

export const DevJoystickOverlay: React.FC<DevJoystickOverlayProps> = ({
  onFollowCoordinate,
  bottomOffset = 90,
}) => {
  if (!__DEV__ || !isDevJoystickEnabled()) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);

  useEffect(() => {
    const controller = locationSimulator.getMovementController();
    const unsubscribe = controller.subscribe(payload => {
      const config = getDevJoystickConfig();
      if (config.followCamera && onFollowCoordinate && payload.isMoving) {
        onFollowCoordinate(payload.position);
      }
    });

    return unsubscribe;
  }, [onFollowCoordinate]);

  const handleRecenter = () => {
    const currentPos = locationSimulator.getCurrentPosition();
    if (currentPos?.coords && onFollowCoordinate) {
      onFollowCoordinate({
        latitude: currentPos.coords.latitude,
        longitude: currentPos.coords.longitude,
      });
    }
  };

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      {/* Botón de colapsar/expandir */}
      <TouchableOpacity
        style={styles.togglePill}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.togglePillIcon}>🕹️</Text>
        <Text style={styles.togglePillText}>
          {isExpanded ? 'Dev Joystick ▼' : 'Dev Joystick ▲'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.contentRow} pointerEvents="box-none">
          {/* Panel de telemetría a la izquierda */}
          {showTelemetry && (
            <View style={styles.telemetryWrapper}>
              <DevJoystickTelemetry onRecenterCamera={handleRecenter} />
            </View>
          )}

          {/* Stick de joystick a la derecha */}
          <View style={styles.stickWrapper}>
            <DevJoystickStick size={110} stickSize={46} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  togglePillIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  togglePillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  telemetryWrapper: {
    marginBottom: 4,
  },
  stickWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
