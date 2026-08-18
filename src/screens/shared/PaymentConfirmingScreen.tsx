import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';
import { useFlow } from '../../hooks/useFlow';
import type { PaymentReturnType } from '../../payments/parsePaymentReturnUrl';
import type { PaymentConfirmationState } from '../../payments/paymentReturnState';

const RETRY_DELAYS_MS = [0, 3000, 6000];

const OUTCOME_MESSAGES: Record<PaymentReturnType, { title: string; subtitle: string }> = {
  product: { title: '¡Compra Exitosa!', subtitle: 'Tu producto será enviado pronto.' },
  job: { title: '¡Trabajador Contratado!', subtitle: 'El profesional será notificado.' },
  ad: { title: '¡Anuncio Publicado!', subtitle: 'Tu anuncio ya está activo.' },
  realtime: { title: '¡Pago Exitoso!', subtitle: 'Tu transacción se ha procesado correctamente.' },
};

function classifyStatus(status: string): 'SUCCESS' | 'FAILED' | 'PENDING' {
  const s = (status || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'CONFIRMED', 'ACCEPTED'].includes(s)) return 'SUCCESS';
  if (['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(s)) return 'FAILED';
  return 'PENDING';
}

export const PaymentConfirmingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { type, token } = (route.params || {}) as { type: PaymentReturnType; token: string };
  const { confirm } = useFlow();

  const [state, setState] = useState<PaymentConfirmationState>('RECEIVED');
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every runConfirm() call (auto-retry or manual). A call whose
  // generation no longer matches when it resolves is stale and must not
  // drive state/navigation — closes the race between a scheduled auto-retry
  // and a manual "Reintentar" tap.
  const generationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const runConfirm = useCallback(
    async (attemptIndex: number) => {
      if (!mountedRef.current) return;
      setState('CONFIRMING');
      if (__DEV__) console.log(`[PAY:CONFIRM_START] paymentId=${token} type=${type}`);

      try {
        const status = await confirm(type, token);
        if (!mountedRef.current) return;
        const outcome = classifyStatus(status);
        if (__DEV__) console.log(`[PAY:CONFIRM_RESULT] paymentId=${token} status=${status} outcome=${outcome}`);

        if (outcome === 'SUCCESS') {
          setState('SUCCESS');
          const msg = OUTCOME_MESSAGES[type];
          navigation.replace('PaymentSuccess', { title: msg.title, subtitle: msg.subtitle, type });
          return;
        }
        if (outcome === 'FAILED') {
          setState('FAILED');
          navigation.replace('PaymentFailed', { type });
          return;
        }

        // PENDING: bounded retry, never infinite polling.
        if (attemptIndex + 1 < RETRY_DELAYS_MS.length) {
          setState('PENDING');
          setAttempt(attemptIndex + 1);
          timeoutRef.current = setTimeout(() => {
            runConfirm(attemptIndex + 1);
          }, RETRY_DELAYS_MS[attemptIndex + 1]);
        } else {
          setState('PENDING');
        }
      } catch {
        // Network/API unavailability is not the same as a FAILED payment (§38).
        if (!mountedRef.current) return;
        if (__DEV__) console.log(`[PAY:CONFIRM_RESULT] paymentId=${token} status=CONFIRMATION_UNAVAILABLE`);
        if (attemptIndex + 1 < RETRY_DELAYS_MS.length) {
          setState('PENDING');
          setAttempt(attemptIndex + 1);
          timeoutRef.current = setTimeout(() => {
            runConfirm(attemptIndex + 1);
          }, RETRY_DELAYS_MS[attemptIndex + 1]);
        } else {
          setState('PENDING');
        }
      }
    },
    [confirm, type, token, navigation],
  );

  useEffect(() => {
    if (!token || !type) {
      navigation.replace('PaymentFailed', { type });
      return;
    }
    runConfirm(0);
    // Only run once per mount — retries are scheduled internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRetry = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAttempt(0);
    runConfirm(0);
  };

  if (state === 'PENDING' && attempt >= RETRY_DELAYS_MS.length - 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCirclePending}>
            <Icon name="Clock" size={48} color={TOKENS.colors.white} />
          </View>
          <Text style={styles.title}>Tu pago todavía se está confirmando</Text>
          <Text style={styles.subtitle}>
            Esto puede tardar unos minutos. Te avisaremos apenas se confirme.
          </Text>
          <Button title="Reintentar" onPress={handleManualRetry} style={styles.btn} />
          <Button
            title="Volver al inicio"
            variant="secondary"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] })}
            style={styles.btn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
        <Text style={styles.confirmingText}>Confirmando pago...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
    gap: TOKENS.spacing.md,
  },
  confirmingText: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  iconCirclePending: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: TOKENS.colors.warning600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: TOKENS.spacing.md,
  },
  btn: {
    width: '100%',
  },
});
