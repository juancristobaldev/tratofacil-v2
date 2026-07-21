import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge } from '../../components';

interface ServiceItem { id: string; name: string; category: string; price: number; status: 'ACTIVE' | 'PAUSED'; }

const MY_SERVICES: ServiceItem[] = [
  { id: 's_01', name: 'Especialista en Tableros e Iluminación', category: 'Electricidad', price: 22000, status: 'ACTIVE' },
  { id: 's_02', name: 'Instalaciones Eléctricas Domiciliarias SEC', category: 'Electricidad', price: 25000, status: 'ACTIVE' },
  { id: 's_03', name: 'Mantención y Reparación de Calefactores', category: 'Mecánica/Calefacción', price: 18000, status: 'PAUSED' },
];

export const MyServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <Text style={styles.subtitle}>Administra los servicios técnicos que ofreces a tus clientes en TratoFácil.</Text>
        </View>
        <View style={styles.servicesList}>
          {MY_SERVICES.map((item) => (
            <Card key={item.id} style={styles.serviceCard} padded={true}>
              <View style={styles.cardHeader}>
                <View style={styles.titleCol}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceCat}>{item.category}</Text>
                </View>
                <Badge label={item.status === 'ACTIVE' ? 'Activo' : 'Pausado'} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} />
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <Text style={styles.priceText}>Valor estimado: <Text style={styles.priceVal}>${item.price.toLocaleString('es-CL')} / hr</Text></Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}><Icon name="Edit" size={16} color={TOKENS.colors.textSubtle} /></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}><Icon name={item.status === 'ACTIVE' ? 'Pause' : 'Play'} size={16} color={TOKENS.colors.textSubtle} /></TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Button title="Publicar Nuevo Servicio" onPress={() => navigation.navigate('PublishService')} icon="Plus" style={styles.publishBtn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, paddingBottom: 90 },
  introRow: { marginBottom: TOKENS.spacing.md },
  subtitle: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18 },
  servicesList: { gap: TOKENS.spacing.md },
  serviceCard: { backgroundColor: TOKENS.colors.white },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCol: { flex: 1, marginRight: 16 },
  serviceName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  serviceCat: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2, fontWeight: '500' },
  cardDivider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle },
  priceVal: { fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center' },
  footer: { backgroundColor: TOKENS.colors.white, borderTopWidth: 1, borderColor: TOKENS.colors.surface200, paddingHorizontal: TOKENS.spacing.lg, justifyContent: 'center' },
  publishBtn: { width: '100%' },
});
