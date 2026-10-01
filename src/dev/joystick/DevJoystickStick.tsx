import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { JoystickVector } from './movementController';
import { locationSimulator } from './locationSimulator';
import { getDevJoystickConfig } from './devFlags';

interface DevJoystickStickProps {
  size?: number; // Diámetro del contenedor exterior (px)
  stickSize?: number; // Diámetro del stick interior (px)
  onVectorChange?: (vector: JoystickVector) => void;
  onRelease?: () => void;
}

const DEFAULT_SIZE = 120;
const DEFAULT_STICK_SIZE = 50;

export const DevJoystickStick: React.FC<DevJoystickStickProps> = ({
  size = DEFAULT_SIZE,
  stickSize = DEFAULT_STICK_SIZE,
  onVectorChange,
  onRelease,
}) => {
  const maxRadius = (size - stickSize) / 2;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const controller = locationSimulator.getMovementController();

  const handleVector = (vec: JoystickVector) => {
    if (!locationSimulator.isSimulating()) {
      locationSimulator.enableSimulation();
    }
    controller.updateVector(vec);
    onVectorChange?.(vec);
  };

  const handleEnd = () => {
    controller.releaseStick();
    onRelease?.();
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isDragging.value = true;
    })
    .onUpdate(e => {
      'worklet';
      const rawX = e.translationX;
      const rawY = e.translationY;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);

      let clampedX = rawX;
      let clampedY = rawY;

      if (dist > maxRadius) {
        clampedX = (rawX / dist) * maxRadius;
        clampedY = (rawY / dist) * maxRadius;
      }

      translateX.value = clampedX;
      translateY.value = clampedY;

      const normX = clampedX / maxRadius;
      const normY = clampedY / maxRadius;
      const magnitude = Math.min(1, Math.sqrt(normX * normX + normY * normY));

      // Rumbo en grados: 0° Norte (-Y), 90° Este (+X), 180° Sur (+Y), 270° Oeste (-X)
      const rad = Math.atan2(normX, -normY);
      const angle = ((rad * 180) / Math.PI + 360) % 360;

      const vector: JoystickVector = {
        x: normX,
        y: normY,
        magnitude,
        angle,
      };

      runOnJS(handleVector)(vector);
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      translateX.value = withSpring(0, { damping: 14, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 14, stiffness: 180 });
      runOnJS(handleEnd)();
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      translateX.value = withSpring(0, { damping: 14, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 14, stiffness: 180 });
    });

  const animatedStickStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: isDragging.value ? 1.10 : 1.0 },
      ],
      backgroundColor: isDragging.value ? '#0284c7' : '#0369a1',
      borderColor: isDragging.value ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)',
    };
  });

  const halfSize = size / 2;
  const halfStick = stickSize / 2;
  const midGuideRadius = (size * 0.6) / 2;
  const deadZoneRadius = (size * 0.22) / 2;

  return (
    <View style={[styles.baseCircle, { width: size, height: size, borderRadius: halfSize }]}>
      {/* Anillo guía de medio recorrido (50-60% throttle) */}
      <View
        style={[
          styles.guideCircle,
          {
            width: midGuideRadius * 2,
            height: midGuideRadius * 2,
            borderRadius: midGuideRadius,
          },
        ]}
      />

      {/* Anillo guía de zona muerta (Deadzone) */}
      <View
        style={[
          styles.deadzoneCircle,
          {
            width: deadZoneRadius * 2,
            height: deadZoneRadius * 2,
            borderRadius: deadZoneRadius,
          },
        ]}
      />

      {/* Retícula sutil de ejes */}
      <View style={[styles.axisCrossHorizontal, { width: size - 32, left: 16, top: halfSize - 0.5 }]} />
      <View style={[styles.axisCrossVertical, { height: size - 32, top: 16, left: halfSize - 0.5 }]} />

      {/* Indicadores cardinales sutiles */}
      <View style={[styles.cardinalNorth, { top: 6, left: halfSize - 8 }]}>
        <View style={styles.northDot} />
      </View>
      <View style={[styles.cardinalDot, { right: 8, top: halfSize - 2 }]} />
      <View style={[styles.cardinalDot, { bottom: 8, left: halfSize - 2 }]} />
      <View style={[styles.cardinalDot, { left: 8, top: halfSize - 2 }]} />

      {/* Stick táctil de precisión */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.stick,
            {
              width: stickSize,
              height: stickSize,
              borderRadius: halfStick,
              left: halfSize - halfStick,
              top: halfSize - halfStick,
            },
            animatedStickStyle,
          ]}
        >
          {/* Anillo interno de agarre táctil */}
          <View style={styles.stickInnerGrip}>
            <View style={styles.stickCenterBeacon} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  baseCircle: {
    backgroundColor: 'rgba(10, 18, 38, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  guideCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deadzoneCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)',
    backgroundColor: 'rgba(56, 189, 248, 0.03)',
  },
  axisCrossHorizontal: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  axisCrossVertical: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardinalNorth: {
    position: 'absolute',
    width: 16,
    alignItems: 'center',
  },
  northDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  cardinalDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stick: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  stickInnerGrip: {
    width: '68%',
    height: '68%',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickCenterBeacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
});
