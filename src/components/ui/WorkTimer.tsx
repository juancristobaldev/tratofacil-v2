import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TOKENS } from '../../theme';

interface WorkTimerProps {
  startedAt?: string | Date | null;
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const WorkTimer: React.FC<WorkTimerProps> = ({ startedAt }) => {
  const [seconds, setSeconds] = useState<number>(() => {
    if (!startedAt) return 0;
    const startMs = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  });

  useEffect(() => {
    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();
    setSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    const timer = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
      <Text style={styles.timerVal}>{formatTimer(seconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerVal: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginTop: 2,
  },
});
