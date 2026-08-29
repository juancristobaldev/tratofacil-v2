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
        { scale: isDragging.value ? 1.08 : 1.0 },
      ],
      backgroundColor: isDragging.value ? '#22d3ee' : '#38bdf8',
    };
  });

  const halfSize = size / 2;
  const halfStick = stickSize / 2;

  return (
    <View style={[styles.baseCircle, { width: size, height: size, borderRadius: halfSize }]}>
      {/* Retícula de ejes */}
      <View style={[styles.axisCrossHorizontal, { width: size - 24, left: 12, top: halfSize - 0.5 }]} />
      <View style={[styles.axisCrossVertical, { height: size - 24, top: 12, left: halfSize - 0.5 }]} />

      {/* Indicador de rumbo Norte */}
      <View style={[styles.northTick, { top: 6, left: halfSize - 3 }]} />

      {/* Stick táctil */}
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
          <View style={styles.stickCenterDot} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  baseCircle: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  axisCrossHorizontal: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  axisCrossVertical: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  northTick: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
  stick: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  stickCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
});
