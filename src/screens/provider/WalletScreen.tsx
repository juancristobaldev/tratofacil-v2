import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Modal, ErrorState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';

export const WalletScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
      const result = await requestWithdrawal();
      setModalVisible(false);
      setSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo procesar el retiro.');
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <Card style={styles.balanceCard} padded={true}>
          <Text style={styles.balanceLabel}>Saldo disponible</Text>
          <Text style={styles.balanceVal}>${balance.toLocaleString('es-CL')}</Text>
          <Button
            title="Retirar dinero"
            onPress={() => setModalVisible(true)}
            variant="secondary"
            icon="ArrowDownCircle"
            style={styles.withdrawBtn}
            disabled={balance <= 0}
          />
        </Card>
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Historial de transacciones</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Sin movimientos recientes</Text>
          ) : (
            transactions.map((t) => {
              const isIncome = t.type === 'EARNING';
              return (
                <View key={t.id} style={styles.transactionRow}>
                  <View style={[styles.txIconCircle, isIncome ? styles.txIconIncome : styles.txIconWithdraw]}>
                    <Icon name={isIncome ? 'Plus' : 'Minus'} size={14} color={isIncome ? TOKENS.colors.statusSuccess : TOKENS.colors.statusError} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>{t.description || 'Transacción'}</Text>
                    <Text style={styles.txDate}>{new Date(t.createdAt).toLocaleDateString('es-CL')}</Text>
                  </View>
                  <Text style={[styles.txAmount, isIncome ? styles.txAmtIncome : styles.txAmtWithdraw]}>
                    {isIncome ? '+' : '-'}${Math.abs(t.amount).toLocaleString('es-CL')}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <Text style={styles.modalTitle}>Retirar Fondos</Text>
        <Text style={styles.modalSub}>Se transferirá el saldo total disponible a tu cuenta bancaria registrada.</Text>
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

      <Modal visible={successModalVisible} onClose={handleSuccessClose} showCloseButton={false}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}><Icon name="Check" size={28} color={TOKENS.colors.white} /></View>
          <Text style={styles.successTitle}>¡Retiro solicitado!</Text>
          <Text style={styles.successSub}>Tu retiro de ${balance.toLocaleString('es-CL')} CLP está siendo procesado. El dinero estará en tu cuenta en un máximo de 24 horas hábiles.</Text>
          <Button title="Entendido" onPress={handleSuccessClose} style={styles.successBtn} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white, gap: 12 },
  loadingText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  scrollBody: { padding: TOKENS.spacing.lg },
  balanceCard: { backgroundColor: TOKENS.colors.brand50, borderColor: TOKENS.colors.brand100, alignItems: 'center', paddingVertical: 24, marginBottom: TOKENS.spacing.lg },
  balanceLabel: { fontSize: 10, color: TOKENS.colors.brand600, fontWeight: 'bold', textTransform: 'uppercase' },
  balanceVal: { fontSize: 36, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.textMain, marginTop: 6 },
  withdrawBtn: { width: 180, height: 44, marginTop: 16 },
  transactionsSection: { marginTop: TOKENS.spacing.sm },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  txIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txIconIncome: { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  txIconWithdraw: { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
  txInfo: { flex: 1, marginLeft: 12 },
  txTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  txDate: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.black },
  txAmtIncome: { color: TOKENS.colors.statusSuccess },
  txAmtWithdraw: { color: TOKENS.colors.statusError },
  modalTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, textAlign: 'center', lineHeight: 14, marginBottom: TOKENS.spacing.md },
  modalForm: { gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  balanceBox: { backgroundColor: TOKENS.colors.surface50, borderRadius: 12, padding: TOKENS.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  balanceBoxLabel: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginBottom: 4 },
  balanceBoxValue: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.brand500 },
  modalConfirmBtn: { width: '100%' },
  successContainer: { alignItems: 'center', paddingVertical: 12 },
  successIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: TOKENS.colors.statusSuccess, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...TOKENS.shadows.soft },
  successTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: 4 },
  successSub: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, textAlign: 'center', lineHeight: 18, marginBottom: TOKENS.spacing.lg },
  successBtn: { width: '100%' },
  emptyText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', paddingVertical: 24 },
});
