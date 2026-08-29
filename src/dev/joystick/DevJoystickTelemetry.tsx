import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { locationSimulator } from './locationSimulator';
import {
  getDevJoystickConfig,
  setDevJoystickConfig,
  type DevJoystickConfig,
} from './devFlags';
import type { MovementUpdatePayload } from './movementController';

interface DevJoystickTelemetryProps {
  onRecenterCamera?: () => void;
}

export const DevJoystickTelemetry: React.FC<DevJoystickTelemetryProps> = ({
  onRecenterCamera,
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

    return () => {
      unsubscribeMovement();
      unsubscribeSim();
    };
  }, []);

  const handleToggleStreet = () => {
    const next = !config.streetSnapMode;
    setDevJoystickConfig({ streetSnapMode: next });
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

  return (
    <View style={styles.container}>
      {/* Barra superior de estado */}
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
        <Text style={styles.modeBadge}>
          {telemetry.isSnapped ? 'CALLERA ACTIVA' : 'MODO LIBRE'}
        </Text>
      </View>

      {/* Fila de telemetría principal */}
      <View style={styles.dataRow}>
        <View style={styles.dataCol}>
          <Text style={styles.dataLabel}>LAT / LNG</Text>
          <Text style={styles.dataValue}>
            {telemetry.position.latitude.toFixed(5)}, {telemetry.position.longitude.toFixed(5)}
          </Text>
        </View>
        <View style={styles.dataColRight}>
          <Text style={styles.dataLabel}>VELOCIDAD</Text>
          <Text style={[styles.dataValue, styles.speedHighlight]}>
            {telemetry.speedKmh.toFixed(1)} km/h
          </Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataCol}>
          <Text style={styles.dataLabel}>RUMBO</Text>
          <Text style={styles.dataValue}>
            {Math.round(telemetry.heading)}° ({getCompassDirection(telemetry.heading)})
          </Text>
        </View>
        <View style={styles.dataColRight}>
          <Text style={styles.dataLabel}>SEGMENTOS</Text>
          <Text style={styles.dataValue}>
            {locationSimulator.getMovementController().getStreetEngine().getSegmentCount()} en caché
          </Text>
        </View>
      </View>

      {/* Botones de acción rápida */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, config.streetSnapMode && styles.actionBtnActive]}
          onPress={handleToggleStreet}
        >
          <Text style={[styles.actionBtnText, config.streetSnapMode && styles.actionBtnTextActive]}>
            {config.streetSnapMode ? '🛣️ Calles ON' : '🧭 Libre'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, config.followCamera && styles.actionBtnActive]}
          onPress={handleToggleFollow}
        >
          <Text style={[styles.actionBtnText, config.followCamera && styles.actionBtnTextActive]}>
            {config.followCamera ? '📷 Cámara ON' : '📷 Libre'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnReset} onPress={handleResetRealGps}>
          <Text style={styles.actionBtnResetText}>🛰️ GPS Real</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de velocidad máxima */}
      <View style={styles.speedSelectorRow}>
        <Text style={styles.speedSelectorLabel}>Max:</Text>
        {[
          { label: '5k', kmh: 5 },
          { label: '18k', kmh: 18 },
          { label: '35k', kmh: 35 },
          { label: '60k', kmh: 60 },
        ].map(preset => (
          <TouchableOpacity
            key={preset.kmh}
            style={[
              styles.speedPresetBtn,
              config.speedKmh === preset.kmh && styles.speedPresetBtnActive,
            ]}
            onPress={() => handleSetSpeed(preset.kmh)}
          >
            <Text
              style={[
                styles.speedPresetText,
                config.speedKmh === preset.kmh && styles.speedPresetTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

function getCompassDirection(bearing: number): string {
  const normalized = (bearing % 360 + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SO';
  if (normalized >= 247.5 && normalized < 292.5) return 'O';
  return 'NO';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 10,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeBadge: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dataCol: {
    flex: 1,
  },
  dataColRight: {
    alignItems: 'flex-end',
  },
  dataLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '600',
  },
  dataValue: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  speedHighlight: {
    color: '#22d3ee',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  actionBtnText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '600',
  },
  actionBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  actionBtnReset: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    alignItems: 'center',
  },
  actionBtnResetText: {
    color: '#fda4af',
    fontSize: 9,
    fontWeight: '700',
  },
  speedSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  speedSelectorLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  speedPresetBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  speedPresetBtnActive: {
    backgroundColor: '#0284c7',
  },
  speedPresetText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  speedPresetTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
