import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  WorkTimer,
  formatTimer,
  parseTimerStartMs,
  calculateElapsedSeconds,
} from './WorkTimer';

describe('WorkTimer utilities and component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatTimer', () => {
    it('returns 00:00 for negative numbers', () => {
      expect(formatTimer(-1)).toBe('00:00');
      expect(formatTimer(-65)).toBe('00:00');
      expect(formatTimer(-3600)).toBe('00:00');
    });

    it('returns 00:00 for NaN and non-finite values', () => {
      expect(formatTimer(NaN)).toBe('00:00');
      expect(formatTimer(Infinity)).toBe('00:00');
      expect(formatTimer(-Infinity)).toBe('00:00');
    });

    it('returns 00:00 for 0', () => {
      expect(formatTimer(0)).toBe('00:00');
    });

    it('formats MM:SS correctly for under 1 hour', () => {
      expect(formatTimer(5)).toBe('00:05');
      expect(formatTimer(59)).toBe('00:59');
      expect(formatTimer(60)).toBe('01:00');
      expect(formatTimer(65)).toBe('01:05');
      expect(formatTimer(599)).toBe('09:59');
      expect(formatTimer(3599)).toBe('59:59');
    });

    it('formats HH:MM:SS correctly for 1 hour or more', () => {
      expect(formatTimer(3600)).toBe('01:00:00');
      expect(formatTimer(3665)).toBe('01:01:05');
      expect(formatTimer(7325)).toBe('02:02:05');
    });
  });

  describe('parseTimerStartMs', () => {
    it('returns null for falsy inputs', () => {
      expect(parseTimerStartMs(null)).toBeNull();
      expect(parseTimerStartMs(undefined)).toBeNull();
      expect(parseTimerStartMs('')).toBeNull();
    });

    it('returns null for invalid date strings', () => {
      expect(parseTimerStartMs('invalid-date')).toBeNull();
    });

    it('parses valid ISO date strings, timestamps, and Date objects', () => {
      const now = new Date('2026-09-08T12:00:00.000Z');
      expect(parseTimerStartMs('2026-09-08T12:00:00.000Z')).toBe(now.getTime());
      expect(parseTimerStartMs(now)).toBe(now.getTime());
      expect(parseTimerStartMs(now.getTime())).toBe(now.getTime());
      expect(parseTimerStartMs(String(now.getTime()))).toBe(now.getTime());
    });

    it('normalizes ISO string without Z to UTC', () => {
      const expected = new Date('2026-09-08T12:00:00Z').getTime();
      expect(parseTimerStartMs('2026-09-08T12:00:00')).toBe(expected);
      expect(parseTimerStartMs('2026-09-08 12:00:00')).toBe(expected);
    });
  });

  describe('calculateElapsedSeconds', () => {
    it('returns 0 when startedAt is in the future (clock skew)', () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      // Server startedAt is 10 seconds in the future relative to device
      const futureDate = new Date(baseTime + 10000).toISOString();
      expect(calculateElapsedSeconds(futureDate)).toBe(0);
      expect(formatTimer(calculateElapsedSeconds(futureDate))).toBe('00:00');
    });

    it('returns 0 for falsy or invalid startedAt without fallback', () => {
      expect(calculateElapsedSeconds(null)).toBe(0);
      expect(calculateElapsedSeconds(undefined)).toBe(0);
      expect(calculateElapsedSeconds('not-a-date')).toBe(0);
    });

    it('calculates exact elapsed seconds using fallback when startedAt is null', () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      const fallbackMs = baseTime - 12000;
      expect(calculateElapsedSeconds(null, fallbackMs)).toBe(12);
    });

    it('calculates exact elapsed seconds for past startedAt', () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      // 45 seconds in past
      const pastDate = new Date(baseTime - 45000).toISOString();
      expect(calculateElapsedSeconds(pastDate)).toBe(45);
      expect(formatTimer(calculateElapsedSeconds(pastDate))).toBe('00:45');
    });
  });

  describe('WorkTimer Component', () => {
    it('renders custom label and 00:00 when startedAt is in the future', async () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      const futureDate = new Date(baseTime + 15000).toISOString();
      const view = await render(<WorkTimer startedAt={futureDate} label="Tiempo de servicio" />);

      expect(view.getByText('00:00')).toBeTruthy();
      expect(view.getByText('Tiempo de servicio')).toBeTruthy();
    });

    it('starts counting up from mount time when startedAt is null', async () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      const view = await render(<WorkTimer startedAt={null} />);
      expect(view.getByText('00:00')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(view.getByText('00:03')).toBeTruthy();
    });

    it('advances timer every second safely without going negative', async () => {
      const baseTime = 1725800000000;
      jest.setSystemTime(baseTime);

      // Started 2 seconds in the future
      const futureDate = new Date(baseTime + 2000).toISOString();
      const view = await render(<WorkTimer startedAt={futureDate} />);

      expect(view.getByText('00:00')).toBeTruthy();

      // Advance 1s: still 1s in future -> 00:00 (not negative)
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(view.getByText('00:00')).toBeTruthy();

      // Advance 1s: reached exact startedAt -> 00:00
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(view.getByText('00:00')).toBeTruthy();

      // Advance 1s: 1s past startedAt -> 00:01
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(view.queryByText('00:01')).toBeTruthy();
    });
  });
});
