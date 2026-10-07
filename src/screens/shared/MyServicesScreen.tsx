import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge, EmptyState, ErrorState, CTABannerButton } from '../../components';
import { useServices } from '../../hooks/useServices';
import { useRefresh } from '../../context/RefreshContext';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { ProviderOnlyGate } from '../../components/ui/ProviderOnlyGate';

export const MyServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { user } = useAuth();
  const hasProvider = !!user?.provider;
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
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteService(id) },
    ]);
  };

  const handleNavigatePublish = () => {
    if (role === 'guest') {
      navigation.navigate('Login');
    } else {
      navigation.navigate('PublishService');
    }
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

  const renderItem = ({ item }: { item: any }) => (
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
          onPress={() => {
            const spId = item.serviceProviders?.[0]?.id;
            if (spId) handleDelete(spId, item.name);
          }}
        >
          <Icon name="Trash" size={16} color={TOKENS.colors.statusError} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <ProviderOnlyGate hasProvider={hasProvider} role={role}>
      <View style={styles.container}>
        <FlatList
          data={services}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
          ListHeaderComponent={
            <View style={styles.introRow}>
              <Text style={styles.subtitle}>Administra los servicios técnicos que ofreces a tus clientes en TratoFácil.</Text>
              <CTABannerButton
                title="Publicar Servicio"
                subtitle="Llega a más clientes hoy"
                onPress={handleNavigatePublish}
                style={{ marginTop: 12 }}
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState icon="Wrench" title="No tienes servicios publicados" description="Publica tu primer servicio para que los clientes te encuentren." />
          }
        />
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Button
            title="Publicar Nuevo Servicio"
            onPress={handleNavigatePublish}
            icon="Plus"
            style={styles.publishBtn}
          />
        </View>
      </View>
    </ProviderOnlyGate>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
  listContent: { padding: TOKENS.spacing.md, paddingBottom: 90, gap: TOKENS.spacing.md },
  introRow: { marginBottom: TOKENS.spacing.md },
  subtitle: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18 },
  serviceCard: { backgroundColor: TOKENS.colors.white },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCol: { flex: 1, marginRight: 16 },
  serviceName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  serviceCat: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2, fontWeight: '500' },
  cardDivider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle },
  priceVal: { fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center' },
  footer: { backgroundColor: TOKENS.colors.white, borderTopWidth: 1, borderColor: TOKENS.colors.surface200, paddingHorizontal: TOKENS.spacing.md, justifyContent: 'center' },
  publishBtn: { width: '100%' },
});
