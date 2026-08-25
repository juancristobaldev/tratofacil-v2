import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

export interface StepItem {
  key: string | number;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number; // 0-indexed
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStepIndex,
  style,
  testID,
}) => {
  const progressRatio = steps.length > 1 ? currentStepIndex / (steps.length - 1) : 1;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Circle & connecting line row */}
      <View style={styles.stepsRow}>
        {/* Background track line */}
        <View style={styles.trackLine} />
        {/* Active progress track line */}
        <View
          style={[
            styles.activeTrackLine,
            { width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` },
          ]}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <View key={String(step.key)} style={styles.stepNode}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.completedCircle,
                  isCurrent && styles.currentCircle,
                  isUpcoming && styles.upcomingCircle,
                ]}
              >
                {isCompleted ? (
                  <Icon name="Check" size={12} color={TOKENS.colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isCurrent ? styles.currentStepNumber : styles.upcomingStepNumber,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Label row */}
      <View style={styles.labelsRow}>
        {steps.map((step, index) => {
          const isCurrentOrPast = index <= currentStepIndex;
          return (
            <Text
              key={String(step.key)}
              style={[
                styles.stepLabel,
                isCurrentOrPast ? styles.activeStepLabel : styles.inactiveStepLabel,
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: TOKENS.spacing.xs,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 28,
  },
  trackLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 12,
    height: 4,
    backgroundColor: TOKENS.colors.surface200,
    borderRadius: 2,
    zIndex: 0,
  },
  activeTrackLine: {
    position: 'absolute',
    left: 14,
    top: 12,
    height: 4,
    backgroundColor: TOKENS.colors.brand500,
    borderRadius: 2,
    zIndex: 1,
  },
  stepNode: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    backgroundColor: TOKENS.colors.brand500,
    ...TOKENS.shadows.soft,
  },
  currentCircle: {
    backgroundColor: TOKENS.colors.brand500,
    borderWidth: 3,
    borderColor: TOKENS.colors.brand50,
    ...TOKENS.shadows.soft,
  },
  upcomingCircle: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 2,
    borderColor: TOKENS.colors.surface300,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.black,
  },
  currentStepNumber: {
    color: TOKENS.colors.white,
  },
  upcomingStepNumber: {
    color: TOKENS.colors.textSubtle,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: TOKENS.spacing.xs,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeStepLabel: {
    color: TOKENS.colors.brand500,
  },
  inactiveStepLabel: {
    color: TOKENS.colors.textMuted,
  },
});
