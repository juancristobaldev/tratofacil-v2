import React, { useMemo, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Badge, Button, Card, ErrorState } from '../../components';
import { usePanel } from '../../context/PanelContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useProfile } from '../../hooks/useProfile';
import { useNotification } from '../../context/NotificationContext';
import { getImageUrl } from '../../utils/imageUrl';

export const ProviderProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { openPanel } = usePanel();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { createContactRequest } = useTimeRealServices();
  const { showNotification } = useNotification();
  const { providerId } = route.params;

  const [description, setDescription] = useState('¡Necesito tu servicio ahora!');
  const [submitting, setSubmitting] = useState(false);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);

  const {
    publicProfile: profileData,
    publicProfileLoading: loading,
    publicProfileError: error,
    fetchPublicProfile,
  } = useProfile();

  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current++;
    console.log('[TRACE:RENDER_COUNT] ProviderProfileScreen #' + renderCountRef.current + ' | loading:', loading, '| hasProvider:', !!profileData?.provider);
  }

  useEffect(() => {
    if (providerId) fetchPublicProfile(parseInt(providerId, 10));
  }, [providerId, fetchPublicProfile]);

  const provider = useMemo(() => {
    if (profileData?.provider) {
      const p = profileData.provider;
      const allReviews = [...(p.reviews || []), ...(p.realtimeReviews || [])];
      const avgRating = allReviews.length
        ? allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length
        : 0;
      const firstSp = p.services?.[selectedServiceIndex] || p.services?.[0];
      return {
        id: String(p.id),
        name: p.name,
        providerName: p.name,
        avatar: getImageUrl(p.logoImage?.cdnUrl || p.logoUrl || null),
        rating: avgRating,
        reviewsCount: allReviews.length,
        verified: p.certificates?.some((c: any) => c.verified) || false,
        isRealtimeActive: p.isRealtimeActive || false,
        description: p.bio || '',
        pricePerHour: firstSp?.price || 0,
        serviceProviderId: firstSp?.id,
        city: p.location || '',
        serviceName: firstSp?.service?.name || firstSp?.description || '',
        categorySlug: firstSp?.service?.slug || '',
        allServices: p.services || [],
        reviews: allReviews.map((r: any) => ({
          id: String(r.id),
          userName: r.client?.displayName || 'Usuario',
          rating: r.rating,
          comment: r.comment || '',
          date: new Date(r.createdAt).toLocaleDateString('es-CL'),
        })),
      };
    }
    return null;
  }, [profileData, providerId, selectedServiceIndex]);

  const handleBooking = async () => {
    if (!provider) return;

    if (!isAuthenticated) {
      navigation.navigate('GuestCheckout', { provider });
      return;
    }

    if (!location) {
      showNotification({ title: 'Ubicación requerida', message: 'Activa tu ubicación para solicitar un servicio.', type: 'error' });
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      showNotification({ title: 'Descripción requerida', message: 'Describe tu problema con al menos 5 caracteres.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await createContactRequest({
        serviceProviderId: Number(provider.serviceProviderId),
        description: description.trim(),
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      showNotification({ title: 'Solicitud enviada', message: `Espera la cotización de ${provider.name}`, type: 'success' });
      openPanel('focus_client', {
        providerId: provider.id,
        serviceProviderId: provider.serviceProviderId,
        provider,
        isRealtimeActive: provider.isRealtimeActive,
      });
      navigation.goBack();
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo enviar la solicitud.', type: 'error' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.center}>
        <ErrorState message="No se pudo cargar el perfil del profesional." onRetry={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Avatar uri={provider.avatar} name={provider.name} size={80} />
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.serviceName}>{provider.serviceName}</Text>
          <View style={styles.badgesRow}>
            {provider.verified && <Badge label="SEC Autorizado" tone="success" />}
          </View>
          <View style={styles.ratingRow}>
            <Rating rating={provider.rating} size={14} reviewsCount={provider.reviewsCount} showText />
          </View>
          <Text style={styles.price}>${provider.pricePerHour.toLocaleString('es-CL')} / hr</Text>
        </View>

        {provider.allServices.length > 1 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.sectionLabel}>Servicios disponibles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
              {provider.allServices.map((sp: any, index: number) => (
                <TouchableOpacity
                  key={sp.id}
                  style={[styles.serviceChip, selectedServiceIndex === index && styles.serviceChipSelected]}
                  onPress={() => setSelectedServiceIndex(index)}
                >
                  <Text style={[styles.serviceChipText, selectedServiceIndex === index && styles.serviceChipTextSelected]}>
                    {sp.service?.name || sp.description || 'Servicio'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Card style={styles.descCard} padded={true}>
          <Text style={styles.sectionLabel}>Acerca de</Text>
          <Text style={styles.descText}>{provider.description}</Text>
        </Card>

        {provider.isRealtimeActive && (
          <Card style={styles.descCard} padded={true}>
            <Text style={styles.sectionLabel}>Describe tu problema</Text>
            <TextInput
              placeholder="Ej: Necesito cambiar 2 enchufes en la cocina..."
              placeholderTextColor={TOKENS.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.descInput}
            />
          </Card>
        )}

        <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Reseñas ({provider.reviews.length})</Text>
        {provider.reviews.map((review) => (
          <Card key={review.id} style={styles.reviewCard} padded={true}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>{review.userName}</Text>
              <Rating rating={review.rating} size={8} />
            </View>
            <Text style={styles.reviewComment}>"{review.comment}"</Text>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </Card>
        ))}
      </ScrollView>

      {provider.isRealtimeActive && (
        <View style={styles.footer}>
          <Button
            title={submitting ? 'Enviando...' : 'Solicitar cotización ahora'}
            onPress={handleBooking}
            disabled={submitting || !description.trim() || description.trim().length < 5}
            style={styles.footerBtn}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md, paddingBottom: 40 },
  profileSection: { alignItems: 'center', backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusCard, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200, marginBottom: 4 },
  name: { fontSize: TOKENS.typography.sizes.xl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginTop: 12 },
  serviceName: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ratingRow: { marginTop: 8 },
  price: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.brand600, marginTop: 8 },
  descCard: { backgroundColor: TOKENS.colors.white },
  sectionLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  descText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18, marginTop: 6 },
  descInput: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusInput,
    padding: TOKENS.spacing.md,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: TOKENS.spacing.sm,
  },
  footer: {
    padding: TOKENS.spacing.lg,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  footerBtn: { width: '100%' },
  reviewCard: { backgroundColor: TOKENS.colors.white },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  reviewComment: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 16, fontStyle: 'italic' },
  reviewDate: { fontSize: 9, color: TOKENS.colors.textMuted, marginTop: 4 },
  servicesContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  servicesScroll: {
    paddingTop: TOKENS.spacing.sm,
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  serviceChipSelected: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand500,
  },
  serviceChipText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  serviceChipTextSelected: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
