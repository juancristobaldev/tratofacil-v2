import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components';

export const BillingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [hasCard, setHasCard] = useState(true);

  const handleUnlinkCard = () => {
    Alert.alert(
      'Desvincular Tarjeta',
      '¿Estás seguro de que deseas eliminar esta tarjeta? No podrás realizar compras rápidamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desvincular', 
          style: 'destructive',
          onPress: () => setHasCard(false)
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.header}>
          <Text style={styles.title}>Facturación y Pagos</Text>
          <Text style={styles.subtitle}>Administra tus métodos de pago y revisa tus transacciones.</Text>
        </View>

        {/* Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pago Actual</Text>
          {hasCard ? (
            <View style={styles.cardBox}>
              <View style={styles.cardHeader}>
                <Icon name="CreditCard" size={24} color={TOKENS.colors.white} />
                <Text style={styles.cardBrand}>VISA</Text>
              </View>
              <Text style={styles.cardNumber}>**** **** **** 4321</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>JUAN PÉREZ</Text>
                <Text style={styles.cardExp}>12/28</Text>
              </View>
              
              <TouchableOpacity style={styles.unlinkBtn} onPress={handleUnlinkCard}>
                <Icon name="Trash2" size={14} color={TOKENS.colors.white} />
                <Text style={styles.unlinkBtnText}>Desvincular</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCardBox}>
              <Icon name="CreditCard" size={32} color={TOKENS.colors.textSubtle} />
              <Text style={styles.emptyCardText}>No tienes tarjetas vinculadas</Text>
              <Button title="Vincular Nueva Tarjeta" variant="secondary" style={{ marginTop: 12 }} />
            </View>
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas Transacciones</Text>
          <View style={styles.transactionsList}>
            {[
              { id: 1, title: 'Servicio Eléctrico', category: 'Servicios', amount: -35000, date: 'Ayer' },
              { id: 2, title: 'Taladro Percutor 800W', category: 'Marketplace', amount: -45990, date: '12 de Octubre' },
              { id: 3, title: 'Reparación de Cañería', category: 'Trabajos', amount: -15000, date: '05 de Octubre' },
            ].map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={styles.txIcon}>
                    <Icon 
                      name={tx.category === 'Marketplace' ? 'Store' : tx.category === 'Servicios' ? 'Wrench' : 'Briefcase'} 
                      size={16} color={TOKENS.colors.brand500} 
                    />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txCategory}>{tx.category} • {tx.date}</Text>
                  </View>
                </View>
                <Text style={styles.txAmount}>${Math.abs(tx.amount).toLocaleString('es-CL')}</Text>
              </View>
            ))}
          </View>
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
  scrollBody: {
    padding: TOKENS.spacing.lg,
  },
  header: {
    marginBottom: TOKENS.spacing.xl,
  },
  title: {
    fontSize: TOKENS.typography.sizes.h2,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  section: {
    marginBottom: TOKENS.spacing.xl,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  cardBox: {
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    ...TOKENS.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.extrabold,
    fontSize: TOKENS.typography.sizes.lg,
    letterSpacing: 2,
  },
  cardNumber: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xl,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: TOKENS.colors.surface100,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    letterSpacing: 1,
  },
  cardExp: {
    color: TOKENS.colors.surface100,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  unlinkBtn: {
    position: 'absolute',
    top: TOKENS.spacing.lg,
    right: TOKENS.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlinkBtnText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
  },
  emptyCardBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderStyle: 'dashed',
  },
  emptyCardText: {
    marginTop: TOKENS.spacing.sm,
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
  },
  transactionsList: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.md,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  txCategory: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  txAmount: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
});
