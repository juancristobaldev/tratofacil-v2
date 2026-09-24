import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TOKENS } from '../../theme';

interface WorkTimerProps {
  startedAt?: string | Date | number | null;
  label?: string;
}

export function formatTimer(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }
  const totalSecs = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimerStartMs(raw?: string | Date | number | null): number | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : null;
    }
    let normalized = trimmed;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
      normalized = normalized.replace(' ', 'T') + 'Z';
    }
    const ms = new Date(normalized).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function calculateElapsedSeconds(
  startedAt?: string | Date | number | null,
  fallbackStartMs?: number | null,
): number {
  const startMs = parseTimerStartMs(startedAt) ?? (Number.isFinite(fallbackStartMs as number) ? (fallbackStartMs as number) : null);
  if (startMs == null) return 0;
  return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
}

export const WorkTimer: React.FC<WorkTimerProps> = ({ startedAt, label = 'Tiempo transcurrido' }) => {
  const mountStartRef = React.useRef<number>(Date.now());
  const [seconds, setSeconds] = useState<number>(() =>
    calculateElapsedSeconds(startedAt, mountStartRef.current)
  );

  useEffect(() => {
    setSeconds(calculateElapsedSeconds(startedAt, mountStartRef.current));

    const timer = setInterval(() => {
      setSeconds(calculateElapsedSeconds(startedAt, mountStartRef.current));
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>{label}</Text>
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
