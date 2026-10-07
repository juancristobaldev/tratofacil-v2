import { SubscriptionType } from "../../graphql/generated";
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl, Linking, TouchableOpacity } from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';
import { TOKENS } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { CreditCardPreview } from '../../components/ui/CreditCardPreview';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { CARD_DEEP_LINK_CALLBACK } from '../../config/endpoints';
import { DELETE_SAVED_CARD } from '../../graphql/operations/wallet';

export const BillingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIsRefreshing } = useRefresh();

  const hasCard = Boolean(user?.cardActive && user?.last4CardDigits && user?.creditCardType);
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

  const [deleteSavedCardMut, { loading: deletingCard }] = useMutation<{ deleteSavedCard: boolean }>(DELETE_SAVED_CARD);

  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleDeleteCard = () => {
    Alert.alert(
      'Desvincular tarjeta',
      `¿Estás seguro de que deseas eliminar tu tarjeta vinculada ${cardBrand} **** ${cardLast4}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await deleteSavedCardMut();
              if (data?.deleteSavedCard) {
                Alert.alert('Éxito', 'Tarjeta desvinculada correctamente.');
                await onRefresh();
              } else {
                Alert.alert('Error', 'No se pudo desvincular la tarjeta.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Error al desvincular tarjeta.');
            }
          },
        },
      ]
    );
  };

  const handleRegisterCard = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await registerCard(CARD_DEEP_LINK_CALLBACK);
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

  const handleCancel = (orderId: number, type: SubscriptionType.Provider | SubscriptionType.Marketplace) => {
    Alert.alert('Cancelar suscripción', '¿Seguro que deseas cancelar esta suscripción?', [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscription({ orderId, type });
            Alert.alert('Cancelada', 'Suscripción cancelada.');
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleReactivate = async (orderId: number, type: SubscriptionType.Provider | SubscriptionType.Marketplace) => {
    try {
      await reactivateSubscription({ orderId, type });
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

  const renderSubscription = (plan: any, type: SubscriptionType.Provider | SubscriptionType.Marketplace) => {
    if (!plan || !plan.subscriptionFlowId) return null;
    const ended = plan.planEndsAt ? new Date(plan.planEndsAt).getTime() < Date.now() : false;
    return (
      <View style={styles.subscriptionBox}>
        <View style={styles.subsHeader}>
          <Icon name="Crown" size={20} color={TOKENS.colors.brand600} />
          <Text style={styles.subsPlan}>
            {type === SubscriptionType.Provider ? plan.plan.replace('TRATOFACIL_SRV_', '') : plan.plan.replace('TRATOFACIL_PUB_', '') || 'FREE'}
          </Text>
          <Badge
            label={plan.planActive ? 'Activa' : ended ? 'Finalizada' : 'Cancelada'}
            tone={plan.planActive ? 'success' : 'neutral'}
          />
        </View>
        {plan.planEndsAt && (
          <Text style={styles.subsEnds}>Vence el {new Date(plan.planEndsAt).toLocaleDateString('es-CL')}</Text>
        )}
        {plan.planActive ? (
          <Button title="Cancelar Suscripción" variant="outline" onPress={() => handleCancel(plan.id, type)} style={styles.subsBtn} />
        ) : (
          !ended && (
            <Button title="Reactivar Suscripción" variant="outline" onPress={() => handleReactivate(plan.id, type)} style={styles.subsBtn} />
          )
        )}
      </View>
    );
  };

  const tabs = [
    { key: 0 as const, label: 'Tarjetas' },
    { key: 1 as const, label: 'Suscripciones' },
    { key: 2 as const, label: 'Historial' },
  ];

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
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab 0: Tarjetas */}
        {activeTab === 0 && (
          <View style={styles.tabContent}>
            {hasCard ? (
              <CreditCardPreview
                cardBrand={cardBrand}
                last4={cardLast4}
                holderName={user?.displayName || 'TITULAR'}
                statusBadge="VINCULADA"
              />
            ) : (
              <EmptyState
                icon="CreditCard"
                title="No tienes tarjetas vinculadas"
                description="Agrega una tarjeta para suscribirte o pagar servicios fácilmente."
              />
            )}

            <Button
              title={hasCard ? 'Cambiar tarjeta' : 'Agregar nueva tarjeta'}
              icon="Plus"
              variant="primary"
              loading={registering}
              disabled={registering || deletingCard}
              onPress={handleRegisterCard}
              style={styles.actionBtn}
            />

            {hasCard && (
              <Button
                title="Desvincular tarjeta"
                icon="Trash"
                variant="outline"
                loading={deletingCard}
                disabled={registering || deletingCard}
                onPress={handleDeleteCard}
                style={[styles.actionBtn, { marginTop: 10, borderColor: TOKENS.colors.statusError }]}
                textStyle={{ color: TOKENS.colors.statusError }}
              />
            )}
          </View>
        )}

        {/* Tab 1: Suscripciones */}
        {activeTab === 1 && (
          <View style={styles.tabContent}>
            {renderSubscription(providerPlan, SubscriptionType.Provider)}
            {renderSubscription(marketplacePlan, SubscriptionType.Marketplace)}
            {!providerPlan?.subscriptionFlowId && !marketplacePlan?.subscriptionFlowId && (
              <EmptyState
                icon="Crown"
                title="Sin suscripciones activas"
                description="Explora los planes para profesionales y potencia tu visibilidad."
              />
            )}
          </View>
        )}

        {/* Tab 2: Historial */}
        {activeTab === 2 && (
          <View style={styles.tabContent}>
            {payments.length === 0 ? (
              <EmptyState
                icon="Clock"
                title="Sin transacciones recientes"
                description="Tus pagos y renovaciones aparecerán aquí."
              />
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
