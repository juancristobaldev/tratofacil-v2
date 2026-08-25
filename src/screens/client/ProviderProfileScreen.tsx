import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Badge, Button, ErrorState, StatsOverviewCard, ReviewCard, RatingDistribution, SegmentedTabs } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useProfile } from '../../hooks/useProfile';
import { useNotification } from '../../context/NotificationContext';
import { getImageUrl } from '../../utils/imageUrl';

type TabType = 'servicios' | 'sobre_mi' | 'resenas';

export const ProviderProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { createContactRequest } = useRealtime();
  const { showNotification } = useNotification();
  const { providerId } = route.params || {};

  const [activeTab, setActiveTab] = useState<TabType>('servicios');
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
        : 5.0;
      const firstSp = p.services?.[selectedServiceIndex] || p.services?.[0];

      // Histograma de distribución de calificaciones (1 a 5 estrellas)
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      allReviews.forEach((r: any) => {
        const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5) as 1 | 2 | 3 | 4 | 5;
        distribution[star] = (distribution[star] || 0) + 1;
      });

      // Solo incluir certificados con verified === true (sin fileImage requerido)
      const verifiedCertificates = (p.certificates || []).filter((c: any) => c.verified === true);

      return {
        id: String(p.id),
        name: p.name,
        providerName: p.name,
        avatar: getImageUrl(p.logoImage?.cdnUrl || p.logoUrl || null),
        rating: avgRating,
        reviewsCount: allReviews.length,
        verified: verifiedCertificates.length > 0 || !!p.rut,
        isRealtimeActive: p.isRealtimeActive || false,
        description: p.bio || 'Profesional verificado en TratoFácil con experiencia en el rubro.',
        pricePerHour: firstSp?.price || 0,
        serviceProviderId: firstSp?.id,
        city: p.location || 'Santiago',
        serviceName: firstSp?.service?.name || firstSp?.description || 'Servicio Profesional',
        categorySlug: firstSp?.service?.slug || '',
        allServices: p.services || [],
        completedOrdersCount: p.completedOrdersCount || Math.max(allReviews.length * 3, 24),
        certificates: verifiedCertificates,
        distribution,
        reviews: allReviews.map((r: any) => ({
          id: String(r.id),
          userName: r.client?.displayName || 'Cliente Verificado',
          rating: r.rating || 5,
          comment: r.comment || 'Excelente trabajo, muy profesional y puntual.',
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-CL') : 'Reciente',
        })),
      };
    }
    return null;
  }, [profileData, selectedServiceIndex]);

  const handleBooking = async () => {
    if (!provider) return;

    if (!isAuthenticated) {
      navigation.navigate('GuestCheckout', { provider, description: description.trim() });
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
      navigation.navigate('MainApp', { screen: 'Home' });
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
      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO COVER & AVATAR */}
        <View style={styles.heroWrapper}>
          <View style={styles.coverHeader}>
            <TouchableOpacity
              style={[styles.backBtn, { top: Math.max(insets.top, 16) }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <Icon name="ArrowLeft" size={20} color={TOKENS.colors.dark900} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSummaryBox}>
            <View style={styles.avatarWrapper}>
              <Avatar uri={provider.avatar} name={provider.name} size={96} />
              {provider.isRealtimeActive && <View style={styles.onlineBadgeDot} />}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>{provider.name}</Text>
              <Icon name="CheckCircle" size={20} color={TOKENS.colors.brand500} />
            </View>

            <Text style={styles.taglineText}>
              {provider.serviceName} • {provider.city}
            </Text>

            {/* Badges */}
            <View style={styles.badgesRow}>
              <View style={styles.topProBadge}>
                <Text style={styles.topProBadgeText}>Top Pro</Text>
              </View>
              {provider.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verificado</Text>
                </View>
              )}
            </View>

            {/* Stats Resumen */}
            <StatsOverviewCard
              style={{ marginTop: 18 }}
              stats={[
                {
                  value: provider.rating.toFixed(1),
                  label: `${provider.reviewsCount} reseñas`,
                  icon: 'Star',
                  iconColor: TOKENS.colors.starActive,
                },
                {
                  value: `${provider.completedOrdersCount}+`,
                  label: 'Trabajos',
                },
                {
                  value: '98%',
                  label: 'Puntualidad',
                },
              ]}
            />
          </View>
        </View>

        {/* TABS SEGMENTADAS */}
        <View style={styles.tabsContainer}>
          <SegmentedTabs
            tabs={[
              { key: 'servicios' as const, label: 'Servicios' },
              { key: 'sobre_mi' as const, label: 'Sobre Mí' },
              { key: 'resenas' as const, label: 'Reseñas' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </View>

        {/* TAB 1: SERVICIOS */}
        {activeTab === 'servicios' && (
          <View style={styles.tabContentSection}>
            <Text style={styles.sectionHeaderTitle}>Servicio de interés</Text>

            {/* Servicio Seleccionado (Destacado) */}
            <View style={styles.selectedServiceCard}>
              <View style={styles.selectedServiceTag}>
                <Text style={styles.selectedServiceTagText}>Seleccionado</Text>
              </View>
              <Text style={styles.selectedServiceTitle}>{provider.serviceName}</Text>
              <Text style={styles.selectedServiceDesc}>
                {provider.allServices[selectedServiceIndex]?.description ||
                  'Atención garantizada, diagnóstico en terreno y materiales incluidos según acuerdo.'}
              </Text>
              <View style={styles.selectedServicePriceRow}>
                <View>
                  <Text style={styles.priceEstimateLabel}>Precio Estimado</Text>
                  <Text style={styles.priceEstimateVal}>
                    ${(provider.pricePerHour || 25000).toLocaleString('es-CL')}{' '}
                    <Text style={styles.priceEstimateUnit}>/visita</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Otros Servicios */}
            {provider.allServices.length > 1 && (
              <View style={styles.otherServicesSection}>
                <Text style={styles.sectionHeaderTitle}>Otros servicios ofrecidos</Text>
                <View style={styles.otherServicesList}>
                  {provider.allServices.map((sp: any, idx: number) => {
                    if (idx === selectedServiceIndex) return null;
                    return (
                      <TouchableOpacity
                        key={sp.id || idx}
                        style={styles.otherServiceCard}
                        onPress={() => setSelectedServiceIndex(idx)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.otherServiceTitle}>{sp.service?.name || sp.description || 'Servicio adicional'}</Text>
                        {sp.description ? (
                          <Text style={styles.otherServiceDesc} numberOfLines={2}>{sp.description}</Text>
                        ) : null}
                        <Text style={styles.otherServicePrice}>
                          ${(sp.price || 30000).toLocaleString('es-CL')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Requerimiento / Input */}
            <View style={styles.requirementSection}>
              <Text style={styles.sectionHeaderTitle}>Describe tu requerimiento</Text>
              <TextInput
                placeholder="Ej: Necesito reparar una fuga o instalar un equipo..."
                placeholderTextColor={TOKENS.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                style={styles.requirementInput}
              />
            </View>
          </View>
        )}

        {/* TAB 2: SOBRE MÍ (PERFIL Y CERTIFICADOS) */}
        {activeTab === 'sobre_mi' && (
          <View style={styles.tabContentSection}>
            {/* Biografía */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Acerca del profesional</Text>
              <Text style={styles.aboutText}>{provider.description}</Text>
            </View>

            {/* Validaciones de Confianza y Certificados */}
            <View style={styles.trustSection}>
              <Text style={styles.sectionHeaderTitle}>Validaciones de Confianza</Text>

              <View style={styles.trustCard}>
                <View style={[styles.trustIconCircle, { backgroundColor: TOKENS.colors.success50 }]}>
                  <Icon name="CheckCircle" size={18} color={TOKENS.colors.statusSuccess} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={styles.trustCardTitle}>Identidad Verificada</Text>
                  <Text style={styles.trustCardSub}>RUT y antecedentes validados por TratoFácil</Text>
                </View>
              </View>

              <View style={styles.trustCard}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <Icon name="Shield" size={18} color="#2563eb" />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={styles.trustCardTitle}>Antecedentes Limpios</Text>
                  <Text style={styles.trustCardSub}>Certificado actualizado 2026</Text>
                </View>
              </View>

              {/* Certificados de la API GraphQL (verified === true) */}
              {provider.certificates.length > 0 ? (
                provider.certificates.map((cert: any) => (
                  <View key={cert.id} style={styles.certCard}>
                    <View style={styles.certIconCircle}>
                      <Icon name="Award" size={20} color={TOKENS.colors.brand700} />
                    </View>
                    <View style={styles.certTextCol}>
                      <Text style={styles.certTitle}>{cert.title}</Text>
                      <Text style={styles.certSub}>
                        {[cert.institution, cert.year ? `Año ${cert.year}` : null, 'Acreditado'].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                    <View style={styles.certVerifiedPill}>
                      <Text style={styles.certVerifiedPillText}>Verificado</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCertCard}>
                  <Icon name="Award" size={24} color={TOKENS.colors.textMuted} />
                  <Text style={styles.emptyCertText}>Sin certificados verificados registrados actualmente.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 3: RESEÑAS */}
        {activeTab === 'resenas' && (
          <View style={styles.tabContentSection}>
            {/* Resumen de Ratings e Histograma */}
            <RatingDistribution
              averageRating={provider.rating}
              totalReviews={provider.reviewsCount}
              distribution={provider.distribution as any}
            />

            {/* Lista de Reseñas */}
            <View style={styles.reviewsList}>
              {provider.reviews.map((rev: any) => (
                <ReviewCard
                  key={rev.id}
                  userName={rev.userName}
                  rating={rev.rating}
                  date={rev.date}
                  comment={rev.comment}
                  isVerifiedJob={true}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTA INFERIOR FIJO */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.footerInner}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => {
              showNotification({ title: 'Chat directo', message: 'Envía tu solicitud para coordinar por chat.', type: 'info' });
            }}
            activeOpacity={0.8}
            accessibilityLabel="Chat con el profesional"
            accessibilityRole="button"
          >
            <Icon name="MessageSquare" size={22} color={TOKENS.colors.dark900} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]}
            onPress={handleBooking}
            disabled={submitting}
            activeOpacity={0.85}
            accessibilityLabel="Solicitar servicio"
            accessibilityRole="button"
          >
            <Text style={styles.ctaBtnText}>
              {submitting ? 'Enviando solicitud...' : 'Solicitar Cotización'}
            </Text>
            <Icon name="ArrowRight" size={18} color={TOKENS.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 24,
  },

  // HERO COVER
  heroWrapper: {
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
    paddingBottom: 20,
  },
  coverHeader: {
    height: 120,
    backgroundColor: TOKENS.colors.surface100,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
    zIndex: 10,
  },
  profileSummaryBox: {
    alignItems: 'center',
    marginTop: -48,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    borderWidth: 4,
    borderColor: TOKENS.colors.white,
    borderRadius: 52,
    ...TOKENS.shadows.soft,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TOKENS.colors.statusSuccess,
    borderWidth: 3,
    borderColor: TOKENS.colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  nameText: {
    fontSize: 22,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.4,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  topProBadge: {
    backgroundColor: TOKENS.colors.brand500,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    ...TOKENS.shadows.soft,
  },
  topProBadgeText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  verifiedBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // STATS CARD
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 18,
    ...TOKENS.shadows.soft,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statScoreText: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
  },
  statLabelText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: TOKENS.colors.surface200,
  },

  // TABS
  tabsContainer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: 12,
    backgroundColor: TOKENS.colors.surface50,
  },
  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface200,
    borderRadius: 14,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  tabBtnTextActive: {
    color: TOKENS.colors.dark900,
  },

  // TAB CONTENT COMMON
  tabContentSection: {
    paddingHorizontal: TOKENS.spacing.lg,
    gap: 16,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // SERVICIOS
  selectedServiceCard: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 2,
    borderColor: TOKENS.colors.brand500,
    borderRadius: 20,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  selectedServiceTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: TOKENS.colors.brand500,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  selectedServiceTagText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
  },
  selectedServiceTitle: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    paddingRight: 80,
    marginBottom: 6,
  },
  selectedServiceDesc: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    marginBottom: 12,
  },
  selectedServicePriceRow: {
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.brand100,
    paddingTop: 10,
  },
  priceEstimateLabel: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceEstimateVal: {
    fontSize: 20,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand700,
    marginTop: 1,
  },
  priceEstimateUnit: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  otherServicesSection: {
    gap: 8,
  },
  otherServicesList: {
    gap: 10,
  },
  otherServiceCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 18,
    padding: 14,
    ...TOKENS.shadows.soft,
  },
  otherServiceTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginBottom: 4,
  },
  otherServiceDesc: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    lineHeight: 16,
    marginBottom: 6,
  },
  otherServicePrice: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
  },
  requirementSection: {
    gap: 6,
  },
  requirementInput: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: TOKENS.colors.dark900,
    minHeight: 84,
    textAlignVertical: 'top',
    ...TOKENS.shadows.soft,
  },

  // SOBRE MÍ
  aboutCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 18,
    ...TOKENS.shadows.soft,
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
  },
  trustSection: {
    gap: 10,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...TOKENS.shadows.soft,
  },
  trustIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextCol: {
    flex: 1,
  },
  trustCardTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  trustCardSub: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },

  // CERTIFICADOS GRAPHQL
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...TOKENS.shadows.soft,
  },
  certIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTextCol: {
    flex: 1,
  },
  certTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  certSub: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  certVerifiedPill: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  certVerifiedPillText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
    textTransform: 'uppercase',
  },
  emptyCertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  emptyCertText: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    flex: 1,
  },

  // RESEÑAS
  ratingSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 18,
    gap: 18,
    ...TOKENS.shadows.soft,
  },
  ratingScoreCol: {
    alignItems: 'center',
    minWidth: 84,
  },
  ratingBigScore: {
    fontSize: 34,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  ratingOpinionCount: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
    fontWeight: TOKENS.typography.weights.medium,
  },
  histogramCol: {
    flex: 1,
    gap: 4,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  histogramStarNum: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    width: 10,
    textAlign: 'center',
  },
  histogramTrack: {
    flex: 1,
    height: 6,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  histogramFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.starActive,
    borderRadius: 3,
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 18,
    padding: 16,
    ...TOKENS.shadows.soft,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatarInitial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  reviewerInitialText: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  reviewerNameText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  reviewDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reviewDateText: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
  },
  verifiedWorkBadge: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedWorkText: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  reviewCommentText: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // FOOTER BAR
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: 12,
    ...TOKENS.shadows.floating,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.brand700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...TOKENS.shadows.soft,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    color: TOKENS.colors.white,
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
  },
});

