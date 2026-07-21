import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DateFilter = 'Hoy' | 'Semana' | 'Mes' | 'Total';

export const EarningsTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<DateFilter>('Semana');
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Filters */}
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

        {/* Main KPI */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Total Ganado ({filter})</Text>
            <Icon name="TrendingUp" size={20} color={TOKENS.colors.statusSuccess} />
          </View>
          <Text style={styles.kpiValue}>$ 345.900</Text>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiChange}>+12% vs periodo anterior</Text>
          </View>
        </View>

        {/* Secondary KPIs */}
        <View style={styles.secondaryKpiRow}>
          <View style={styles.secondaryKpiCard}>
            <Text style={styles.secKpiLabel}>Servicios Completados</Text>
            <Text style={styles.secKpiValue}>14</Text>
          </View>
          <View style={styles.secondaryKpiCard}>
            <Text style={styles.secKpiLabel}>Promedio por Servicio</Text>
            <Text style={styles.secKpiValue}>$ 24.700</Text>
          </View>
        </View>

        {/* History Table */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Servicios Completados</Text>
        </View>
        
        <View style={styles.list}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <View style={styles.historyIconBox}>
                  <Icon name="Wrench" size={16} color={TOKENS.colors.brand500} />
                </View>
                <View>
                  <Text style={styles.historyTitle}>Reparación de Cañería</Text>
                  <Text style={styles.historyDate}>Ayer, 16:00 hrs</Text>
                </View>
              </View>
              <Text style={styles.historyAmount}>+$ 35.000</Text>
            </View>
          ))}
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
    ...TOKENS.shadows.medium,
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
    ...TOKENS.shadows.soft,
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
    ...TOKENS.shadows.soft,
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
});
