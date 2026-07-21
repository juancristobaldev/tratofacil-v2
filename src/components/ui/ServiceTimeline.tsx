import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TOKENS } from '../../theme';
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

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        
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
            
            {/* Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.time}>{step.time}</Text>
              <Text style={styles.title}>{step.title}</Text>
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
    color: TOKENS.colors.brand500,
    fontWeight: TOKENS.typography.weights.bold,
    marginBottom: 2,
  },
  title: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
});
