import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl, Alert, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, ErrorState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { REGISTER_CARD_CALLBACK_URL } from '../../config/endpoints';

export const BillingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIsRefreshing } = useRefresh();

  const hasCard = !!(user?.last4CardDigits && user?.creditCardType);
  const cardBrand = user?.creditCardType || 'VISA';
  const cardLast4 = user?.last4CardDigits || '****';

  const {
    paymentHistory: payments,
    paymentHistoryLoading: loading,
    paymentHistoryError: error,
    registerCard,
    providerPlan,
    marketplacePlan,
    cancelSubscription,
    reactivateSubscription,
    refetch,
  } = usePlans();

  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleRegisterCard = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await registerCard(REGISTER_CARD_CALLBACK_URL);
      if (result.alreadyRegistered) {
        Alert.alert('Tarjeta', 'Ya tienes una tarjeta vinculada.');
      } else if (result.url) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Error', 'No se pudo iniciar el registro de la tarjeta.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo vincular la tarjeta.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = (flowId: string, type: 'PROVIDER' | 'MARKETPLACE') => {
    Alert.alert('Cancelar suscripción', '¿Seguro que deseas cancelar esta suscripción?', [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscription({ subscriptionFlowId: flowId, type });
            Alert.alert('Cancelada', 'Suscripción cancelada.');
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleReactivate = async (flowId: string, type: 'PROVIDER' | 'MARKETPLACE') => {
    try {
      await reactivateSubscription({ subscriptionFlowId: flowId, type });
      Alert.alert('Reactivada', 'Suscripción reactivada.');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TOKENS.colors.brand500} /></View>;
  }

  if (error) {
    return <ErrorState message="Error al cargar historial de pagos." />;
  }

  const renderSubscription = (
    plan: { planActive: boolean; planEndsAt: string | null; subscriptionFlowId: string | null; plan: string } | null,
    type: 'PROVIDER' | 'MARKETPLACE'
  ) => {
    if (!plan || !plan.subscriptionFlowId) return null;
    const ended = plan.planEndsAt ? new Date(plan.planEndsAt).getTime() < Date.now() : false;
    return (
      <View style={styles.subscriptionBox}>
        <View style={styles.subsHeader}>
          <Icon name="Crown" size={20} color={TOKENS.colors.brand600} />
          <Text style={styles.subsPlan}>
            {type === 'PROVIDER' ? plan.plan.replace('TRATOFACIL_SRV_', '') : plan.plan.replace('TRATOFACIL_PUB_', '') || 'FREE'}
          </Text>
        </View>
        <Text style={styles.subsStatus}>
          {plan.planActive ? 'Activa' : ended ? 'Finalizada' : 'Cancelada'}
        </Text>
        {plan.planEndsAt && (
          <Text style={styles.subsEnds}>Vence el {new Date(plan.planEndsAt).toLocaleDateString('es-CL')}</Text>
        )}
        {plan.planActive ? (
          <Button title="Cancelar Suscripción" variant="outline" onPress={() => handleCancel(plan.subscriptionFlowId!, type)} style={styles.subsBtn} />
        ) : (
          !ended && (
            <Button title="Reactivar Suscripción" variant="outline" onPress={() => handleReactivate(plan.subscriptionFlowId!, type)} style={styles.subsBtn} />
          )
        )}
      </View>
    );
  };

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TOKENS.colors.brand500}
          />
        }
      >
        {/* Segmented Tabs matching ui-kit.html */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 0 && styles.tabBtnActive]}
            onPress={() => setActiveTab(0)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
              Tarjetas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 1 && styles.tabBtnActive]}
            onPress={() => setActiveTab(1)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
              Suscripciones
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 2 && styles.tabBtnActive]}
            onPress={() => setActiveTab(2)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
              Historial
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 0: Tarjetas */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            {hasCard ? (
              <View style={styles.creditCardBox}>
                <View style={styles.cardHeader}>
                  <Icon name="CreditCard" size={26} color="#CBD5E1" />
                  <Text style={styles.cardBrand}>{cardBrand}</Text>
                </View>
                <Text style={styles.cardNumber}>•••• •••• •••• {cardLast4}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName}>
                    {user?.displayName?.toUpperCase() || 'TITULAR'}
                  </Text>
                  <Text style={styles.cardSecText}>VINCULADA</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCardBox}>
                <Icon name="CreditCard" size={36} color={TOKENS.colors.textSubtle} />
                <Text style={styles.emptyCardTitle}>No tienes tarjetas vinculadas</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Agrega una tarjeta para suscribirte o pagar servicios fácilmente.
                </Text>
              </View>
            )}

            <Button
              title={hasCard ? 'Cambiar tarjeta' : 'Agregar nueva tarjeta'}
              icon="Plus"
              variant="primary"
              loading={registering}
              disabled={registering}
              onPress={handleRegisterCard}
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* Tab 1: Suscripciones */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            {renderSubscription(providerPlan, 'PROVIDER')}
            {renderSubscription(marketplacePlan, 'MARKETPLACE')}
            {!providerPlan?.subscriptionFlowId && !marketplacePlan?.subscriptionFlowId && (
              <View style={styles.emptyCardBox}>
                <Icon name="Crown" size={36} color={TOKENS.colors.textSubtle} />
                <Text style={styles.emptyCardTitle}>Sin suscripciones activas</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Explora los planes para profesionales y potencia tu visibilidad.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tab 2: Historial */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            {payments.length === 0 ? (
              <View style={styles.emptyCardBox}>
                <Icon name="Clock" size={36} color={TOKENS.colors.textSubtle} />
                <Text style={styles.emptyCardTitle}>Sin transacciones recientes</Text>
                <Text style={styles.emptyCardSubtitle}>
                  Tus pagos y renovaciones aparecerán aquí.
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {payments.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <View style={styles.txIcon}>
                        <Icon name="CreditCard" size={16} color={TOKENS.colors.brand500} />
                      </View>
                      <View style={styles.txDetails}>
                        <Text style={styles.txTitle}>{tx.description}</Text>
                        <Text style={styles.txCategory}>
                          {tx.type} • {new Date(tx.createdAt).toLocaleDateString('es-CL')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.txAmount}>
                      ${Math.abs(tx.amount).toLocaleString('es-CL')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
  },
  scrollBody: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },

  // Segmented Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: TOKENS.colors.dark900,
  },
  tabText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  tabTextActive: {
    color: TOKENS.colors.white,
  },
  tabContent: {
    gap: TOKENS.spacing.md,
  },

  // Credit Card Box matching ui-kit.html
  creditCardBox: {
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: 20,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
    ...TOKENS.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.black,
    fontSize: 18,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  cardNumber: {
    color: TOKENS.colors.white,
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: TOKENS.colors.surface300,
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    letterSpacing: 0.5,
  },
  cardSecText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Empty Box
  emptyCardBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginTop: 4,
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    borderRadius: 14,
    height: 52,
  },

  // Subscription Box
  subscriptionBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  subsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subsPlan: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.dark900,
  },
  subsStatus: {
    fontSize: 13,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  subsEnds: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  subsBtn: {
    marginTop: 12,
    borderRadius: 14,
  },

  // Transactions List
  transactionsList: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.dark900,
  },
  txCategory: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
});
