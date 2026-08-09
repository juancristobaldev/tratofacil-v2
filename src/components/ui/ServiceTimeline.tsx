import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TOKENS, MOTION } from '../../theme';
import { Icon, IconName } from './Icon';

export interface TimelineStep {
  time: string;
  title: string;
  description: string;
  iconName: IconName;
  status: 'completed' | 'current' | 'pending';
}

interface ServiceTimelineProps {
  steps: TimelineStep[];
}

const ActiveBeacon: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: MOTION.duration.pulse,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const opacity = pulse.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <View style={styles.beaconWrapper}>
      <Animated.View
        style={[
          styles.beaconRing,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      {children}
    </View>
  );
};

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';

        const iconNode = (
          <View
            style={[
              styles.iconContainer,
              isCompleted || isCurrent ? styles.iconCompleted : styles.iconPending,
            ]}
          >
            <Icon
              name={step.iconName}
              size={16}
              color={isCompleted || isCurrent ? TOKENS.colors.white : TOKENS.colors.textMuted}
            />
          </View>
        );

        return (
          <View key={index} style={styles.stepContainer}>
            {/* Timeline Line */}
            {!isLast && (
              <View
                style={[
                  styles.line,
                  isCompleted ? styles.lineCompleted : styles.linePending,
                ]}
              />
            )}
            
            {/* Icon */}
            {isCurrent ? <ActiveBeacon>{iconNode}</ActiveBeacon> : iconNode}
            
            {/* Content */}
            <View style={styles.contentContainer}>
              <Text style={[styles.time, isCurrent && styles.timeCurrent]}>{step.time}</Text>
              <Text style={[styles.title, isCurrent && styles.titleCurrent]}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: TOKENS.spacing.md,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: TOKENS.spacing.lg,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    left: 15, // center of the 32px icon container
    top: 32, // start after the icon
    bottom: -24, // extend to the next step
    width: 2,
    zIndex: 0,
  },
  lineCompleted: {
    backgroundColor: TOKENS.colors.brand500,
  },
  linePending: {
    backgroundColor: TOKENS.colors.surface200,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 4,
  },
  iconCompleted: {
    backgroundColor: TOKENS.colors.brand500,
  },
  iconPending: {
    backgroundColor: TOKENS.colors.surface200,
  },
  contentContainer: {
    flex: 1,
    marginLeft: TOKENS.spacing.md,
  },
  time: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.semibold,
    marginBottom: 2,
  },
  timeCurrent: {
    color: TOKENS.colors.brand500,
    fontWeight: TOKENS.typography.weights.bold,
  },
  title: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  titleCurrent: {
    color: TOKENS.colors.brand500,
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  beaconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.brand500,
    top: 4,
    zIndex: 0,
  },
});
