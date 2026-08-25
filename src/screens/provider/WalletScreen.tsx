import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { WalletBalanceCard, TransactionListItem } from '../../components/ui/WalletBalanceCard';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { ProviderOnlyGate } from '../../components/ui/ProviderOnlyGate';

export const WalletScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const hasProvider = !!user?.provider;
  const { setIsRefreshing } = useRefresh();
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const { requestWithdrawal, withdrawalLoading: loading, walletLoading, wallet, refetch } = usePlans();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const balance = wallet?.balance || 0;
  const transactions = wallet?.transactions || [];

  if (walletLoading && !wallet) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
        <Text style={styles.loadingText}>Cargando billetera...</Text>
      </View>
    );
  }

  const handleWithdraw = async () => {
    try {
      await requestWithdrawal();
      setModalVisible(false);
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo procesar el retiro.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TransactionListItem
      id={item.id}
      type={item.type}
      amount={item.amount}
      description={item.description}
      date={item.createdAt}
    />
  );

  return (
    <ProviderOnlyGate hasProvider={hasProvider} role={role}>
      <View style={styles.container}>
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + TOKENS.spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
          ListHeaderComponent={
            <>
              <WalletBalanceCard
                balance={balance}
                onWithdraw={() => setModalVisible(true)}
                onRefresh={onRefresh}
              />
              <Text style={styles.sectionTitle}>Historial de Movimientos</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState icon="TrendingUp" title="Sin movimientos recientes" description="Tus ingresos y retiros se reflejarán aquí." />
          }
        />

        <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
          <Text style={styles.modalTitle}>Retirar Fondos</Text>
          <Text style={styles.modalSub}>Se transferirá el saldo disponible a tu cuenta bancaria registrada.</Text>
          <View style={styles.modalForm}>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceBoxLabel}>Saldo a retirar</Text>
              <Text style={styles.balanceBoxValue}>${balance.toLocaleString('es-CL')}</Text>
            </View>
          </View>
          <Button
            title={loading ? 'Procesando...' : 'Confirmar Retiro'}
            onPress={handleWithdraw}
            style={styles.modalConfirmBtn}
            disabled={loading || balance <= 0}
          />
        </Modal>

        <Modal visible={successModalVisible} onClose={() => setSuccessModalVisible(false)} showCloseButton={false}>
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}><Icon name="Check" size={28} color={TOKENS.colors.white} /></View>
            <Text style={styles.successTitle}>¡Retiro solicitado!</Text>
            <Text style={styles.successSub}>Tu retiro de ${balance.toLocaleString('es-CL')} CLP está siendo procesado. El dinero estará en tu cuenta en un máximo de 24 horas hábiles.</Text>
            <Button title="Entendido" onPress={() => setSuccessModalVisible(false)} style={styles.successBtn} />
          </View>
        </Modal>
      </View>
    </ProviderOnlyGate>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white, gap: 12 },
  loadingText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.medium },
  listContent: { padding: TOKENS.spacing.md },

  // Dark Hero Card
  heroBalanceCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    marginBottom: TOKENS.spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...TOKENS.shadows.floating,
  },
  glowDecor: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(230, 0, 126, 0.25)',
  },
  heroLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.white,
    letterSpacing: -1,
    marginBottom: 20,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroWithdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TOKENS.colors.brand500,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...TOKENS.shadows.soft,
  },
  heroBtnDisabled: {
    opacity: 0.5,
  },
  heroWithdrawBtnText: {
    color: TOKENS.colors.white,
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
  },
  heroRefreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },

  // Section Header
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
    letterSpacing: -0.2,
  },

  // Transaction Cards
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.sm,
    ...TOKENS.shadows.soft,
  },
  txIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconIncome: {
    backgroundColor: '#ecfdf5',
  },
  txIconWithdraw: {
    backgroundColor: '#fef2f2',
  },
  txInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  txTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  txDate: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: TOKENS.typography.weights.medium,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: -0.3,
  },
  txAmtIncome: {
    color: TOKENS.colors.statusSuccess,
  },
  txAmtWithdraw: {
    color: TOKENS.colors.dark900,
  },

  // Modals
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: TOKENS.spacing.md,
  },
  modalForm: {
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  balanceBox: {
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 16,
    padding: TOKENS.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  balanceBoxLabel: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceBoxValue: {
    fontSize: 28,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand500,
    letterSpacing: -0.5,
  },
  modalConfirmBtn: {
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...TOKENS.shadows.soft,
  },
  successTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 6,
  },
  successSub: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: TOKENS.spacing.lg,
  },
  successBtn: {
    width: '100%',
  },
});
