import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';

type DateFilter = 'Hoy' | 'Semana' | 'Mes' | 'Total';

function getFilterStartDate(filter: DateFilter): Date | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  switch (filter) {
    case 'Hoy':
      return now;
    case 'Semana': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    case 'Mes': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    default:
      return null;
  }
}

export const EarningsTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<DateFilter>('Semana');
  const { user } = useAuth();
  const { wallet, paymentHistory, refetch } = usePlans();
  const { setIsRefreshing } = useRefresh();
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
  const completedCount = user?.provider?.completedOrdersCount || 0;

  const filterStart = getFilterStartDate(filter);

  const earningTransactions = useMemo(() => {
    const earnings = transactions.filter((t) => t.type === 'EARNING');
    if (!filterStart) return earnings;
    return earnings.filter((t) => {
      const txDate = new Date(t.createdAt);
      return txDate >= filterStart;
    });
  }, [transactions, filterStart]);

  const totalEarningsLifetime = useMemo(
    () => transactions.filter((t) => t.type === 'EARNING').reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const filteredTotal = useMemo(
    () => earningTransactions.reduce((sum, t) => sum + t.amount, 0),
    [earningTransactions],
  );

  const averagePerService = completedCount > 0 ? totalEarningsLifetime / completedCount : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >

        <View style={styles.filtersScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {['Hoy', 'Semana', 'Mes', 'Total'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f as DateFilter)}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Total Ganado ({filter})</Text>
            <Icon name="TrendingUp" size={20} color={TOKENS.colors.statusSuccess} />
          </View>
          <Text style={styles.kpiValue}>${filteredTotal.toLocaleString('es-CL')}</Text>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiChange}>{paymentHistory?.length || 0} transacciones totales</Text>
          </View>
        </View>

        <View style={styles.secondaryKpiRow}>
          <View style={styles.secondaryKpiCard}>
            <Text style={styles.secKpiLabel}>Servicios Completados</Text>
            <Text style={styles.secKpiValue}>{completedCount}</Text>
          </View>
          <View style={styles.secondaryKpiCard}>
            <Text style={styles.secKpiLabel}>Promedio por Servicio</Text>
            <Text style={styles.secKpiValue}>${averagePerService.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movimientos</Text>
        </View>

        <View style={styles.list}>
          {earningTransactions.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Sin movimientos recientes</Text>
            </View>
          ) : (
            earningTransactions.map((tx) => (
              <View key={tx.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIconBox}>
                    <Icon name="DollarSign" size={16} color={TOKENS.colors.brand500} />
                  </View>
                  <View>
                    <Text style={styles.historyTitle}>{tx.description || 'Servicio completado'}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(tx.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyAmount}>+${tx.amount.toLocaleString('es-CL')}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 100,
  },
  filtersScroll: {
    marginHorizontal: -TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  filtersContainer: {
    paddingHorizontal: TOKENS.spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  filterChipActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand500,
  },
  filterText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  filterTextActive: {
    color: TOKENS.colors.white,
  },
  kpiCard: {
    backgroundColor: TOKENS.colors.brand600,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    marginBottom: TOKENS.spacing.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  kpiValue: {
    color: TOKENS.colors.white,
    fontSize: 40,
    fontWeight: TOKENS.typography.weights.extrabold,
    marginBottom: 8,
  },
  kpiFooter: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kpiChange: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
  },
  secondaryKpiRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
  },
  secondaryKpiCard: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  secKpiLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    marginBottom: 8,
  },
  secKpiValue: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  sectionHeader: {
    marginBottom: TOKENS.spacing.md,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  list: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.md,
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  historyDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.statusSuccess,
  },
  emptyRow: {
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
});
