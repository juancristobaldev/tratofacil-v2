import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Badge, Rating } from '../ui';
import { usePanel } from '../../context/PanelContext';

export const FocusProviderPanelContent: React.FC = () => {
  const { panelData, closePanel } = usePanel();
  const [quotedPrice, setQuotedPrice] = useState(22000);
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
        {/* STATE: VIEW_REQUEST */}
        {orderState === 'VIEW_REQUEST' && (
          <View style={styles.viewRequestContainer}>
            <View style={styles.clientCard}>
              <Avatar uri={null} name="Juan Pérez" size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>Juan Pérez</Text>
                <View style={styles.ratingRow}>
                  <Rating rating={4.8} size={14} showText textSuffix="reseñas" reviewsCount={24} />
                </View>
              </View>
              <TouchableOpacity style={styles.actionCircleBtn}>
                <Icon name="MessageSquare" size={18} color={TOKENS.colors.brand500} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detalles del problema</Text>
              <Text style={styles.detailText}>
                Reparación de enchufe en cocina, aparentemente hubo un cortocircuito. Necesito que se revise también el tablero general por si acaso.
              </Text>
            </View>

            <View style={styles.priceAdjusterContainer}>
              <Text style={styles.priceAdjusterLabel}>Cotización total del servicio</Text>
              <View style={styles.priceAdjusterRow}>
                <TouchableOpacity
                  onPress={() => setQuotedPrice((p) => Math.max(5000, p - 1000))}
                  style={styles.adjusterBtn}
                >
                  <Icon name="Minus" size={24} color={TOKENS.colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.priceAdjusterValue}>${quotedPrice.toLocaleString('es-CL')}</Text>
                <TouchableOpacity
                  onPress={() => setQuotedPrice((p) => p + 1000)}
                  style={styles.adjusterBtn}
                >
                  <Icon name="Plus" size={24} color={TOKENS.colors.textMain} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Rechazar"
                variant="outline"
                onPress={closePanel}
                style={styles.actionRowBtn}
              />
              <Button
                title="Enviar cotización"
                onPress={() => setOrderState && setOrderState('WAITING_CLIENT_RESPONSE')}
                style={styles.actionRowBtn}
              />
            </View>
          </View>
        )}

        {/* STATE: WAITING_CLIENT_RESPONSE */}
        {orderState === 'WAITING_CLIENT_RESPONSE' && (
          <View style={styles.waitingContainer}>
            <Icon name="Clock" size={48} color={TOKENS.colors.brand500} />
            <Text style={styles.waitingTitle}>Cotización enviada</Text>
            <Text style={styles.waitingDesc}>Esperando respuesta del cliente...</Text>
            
            <TouchableOpacity onPress={() => setOrderState && setOrderState('VIEW_REQUEST')} style={styles.bypassBtn}>
              <Text style={styles.bypassBtnText}>Simular cliente rechaza/contraoferta</Text>
            </TouchableOpacity>
          </View>
        )}

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
  viewRequestContainer: {
    gap: TOKENS.spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  detailTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  detailText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
  },
  priceAdjusterContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.md,
  },
  priceAdjusterLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 16,
  },
  priceAdjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  adjusterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceAdjusterValue: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
    minWidth: 140,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
  actionRowBtn: {
    flex: 1,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  waitingTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  waitingDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
  },
});
