import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Badge } from '../ui';
import { usePanel } from '../../context/PanelContext';

export const FocusProviderPanelContent: React.FC = () => {
  const { panelData } = usePanel();
  const {
    orderState,
    etaRemaining,
    distanceRemaining,
    workSeconds,
    formatTimer,
    setOrderState,
    handleFinish,
  } = panelData || {};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.sheetBody}>
        {/* STATE 1: EN CAMINO */}
        {orderState === 'EN_CAMINO' && (
          <>
            <View style={styles.stateHeader}>
              <Badge label="DIRIGIÉNDOSE AL CLIENTE" tone="brand" />
              <Text style={styles.etaText}>{etaRemaining} ({distanceRemaining})</Text>
            </View>

            <View style={styles.clientCard}>
              <Avatar uri={null} name="Juan Pérez" size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>Juan Pérez</Text>
                <Text style={styles.clientAddress} numberOfLines={1}>Av. Providencia 1450, Providencia</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL('tel:+56987654321')}
                style={styles.actionCircleBtn}
              >
                <Icon name="Phone" size={18} color={TOKENS.colors.brand500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.guideText}>Conduce hacia la ubicación del cliente para iniciar el servicio.</Text>

            {/* Developer simulator bypass button */}
            <TouchableOpacity onPress={() => setOrderState && setOrderState('ARRIVED')} style={styles.bypassBtn}>
              <Text style={styles.bypassBtnText}>Simular llegada a destino</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STATE 2: ARRIVED */}
        {orderState === 'ARRIVED' && (
          <>
            <View style={styles.stateHeader}>
              <Badge label="LLEGADO AL DESTINO" tone="success" />
              <Text style={styles.etaText}>Listo para iniciar trabajo</Text>
            </View>

            <View style={styles.clientCard}>
              <Avatar uri={null} name="Juan Pérez" size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>Juan Pérez</Text>
                <Text style={styles.clientAddress}>Se encuentra esperando tu llegada</Text>
              </View>
            </View>

            <Button
              title="Iniciar Trabajo"
              onPress={() => setOrderState && setOrderState('IN_PROGRESS')}
              style={styles.actionBtn}
            />
          </>
        )}

        {/* STATE 3: IN PROGRESS */}
        {orderState === 'IN_PROGRESS' && (
          <>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
              <Text style={styles.timerVal}>{formatTimer ? formatTimer(workSeconds) : '00:00'}</Text>
            </View>

            <Text style={styles.workingDesc}>
              Realizando trabajo eléctrico: Reparación de tablero y enchufe.
            </Text>

            <Button
              title="Completar Trabajo"
              onPress={() => setOrderState && setOrderState('COMPLETED')}
              style={styles.actionBtn}
            />
          </>
        )}

        {/* STATE 4: COMPLETED SUMMARY */}
        {orderState === 'COMPLETED' && (
          <>
            <View style={styles.completedContainer}>
              <View style={styles.checkCircle}>
                <Icon name="Check" size={28} color={TOKENS.colors.white} />
              </View>
              <Text style={styles.completedTitle}>¡Servicio Completado!</Text>
              <Text style={styles.completedSub}>Has ganado $22.000 netos</Text>
            </View>

            <Button
              title="Volver al Panel"
              onPress={handleFinish}
              style={styles.actionBtn}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.xl,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  etaText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 12,
    marginBottom: TOKENS.spacing.md,
  },
  clientCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientAddress: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bypassBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  bypassBtnText: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
    textDecorationLine: 'underline',
  },
  actionBtn: {
    width: '100%',
    marginTop: 12,
  },
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
    color: TOKENS.colors.dark900,
    marginTop: 2,
  },
  workingDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginTop: 4,
  },
  completedSub: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    marginBottom: 12,
  },
});
