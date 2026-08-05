import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge, EmptyState, ErrorState } from '../../components';
import { useServices } from '../../hooks/useServices';
import { useRefresh } from '../../context/RefreshContext';

export const MyServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setIsRefreshing } = useRefresh();

  const {
    myServices: services,
    myServicesLoading: loading,
    myServicesError: error,
    deleteService,
    refetch,
  } = useServices();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Eliminar servicio', `¿Estás seguro de eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteService(id),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar tus servicios." onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <View style={styles.introRow}>
          <Text style={styles.subtitle}>Administra los servicios técnicos que ofreces a tus clientes en TratoFácil.</Text>
        </View>
        {services.length === 0 ? (
          <EmptyState icon="Wrench" title="No tienes servicios publicados" description="Publica tu primer servicio para que los clientes te encuentren." />
        ) : (
          <View style={styles.servicesList}>
            {services.map((item) => (
              <Card key={item.id} style={styles.serviceCard} padded={true}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleCol}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.serviceCat}>{item.category?.name || 'Sin categoría'}</Text>
                  </View>
                  <Badge label="Activo" tone="success" />
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardFooter}>
                  <Text style={styles.priceText}>
                    {item.serviceProviders?.[0]?.price ? (
                      <>Valor: <Text style={styles.priceVal}>${item.serviceProviders[0].price.toLocaleString('es-CL')} / hr</Text></>
                    ) : (
                      'Sin precio definido'
                    )}
                  </Text>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <Icon name="Trash" size={16} color={TOKENS.colors.statusError} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Button title="Publicar Nuevo Servicio" onPress={() => navigation.navigate('PublishService')} icon="Plus" style={styles.publishBtn} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
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
