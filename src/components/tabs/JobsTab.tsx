import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Badge, Button } from '../ui';
import { LocationModal } from '../ui/LocationModal';
import { ModalApplyJob } from '../ui/ModalApplyJob';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type JobTabMode = 'Ofertas' | 'Mis Postulaciones' | 'Mis Ofertas';
type OfferFilter = 'Nuevo' | 'Postulado' | 'Sin Postular' | 'Expirado';

export const JobsTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [activeTab, setActiveTab] = useState<JobTabMode>('Ofertas');
  const [activeFilter, setActiveFilter] = useState<OfferFilter>('Nuevo');
  
  const [location, setLocation] = useState('Providencia, RM');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLocationChange = (newLocation: string) => {
    setIsLocationModalOpen(false);
    setIsLoading(true);
    setLocation(newLocation);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleApplyClick = (job: any) => {
    // In a real app, check context for verification:
    // const hasVerification = user?.displayName && user?.emailVerified;
    const hasVerification = true; // Mock true for now
    if (!hasVerification) {
      navigation.navigate('VerificationCenter');
      return;
    }
    setSelectedJob(job);
    setIsApplyModalOpen(true);
  };

  const handleSuccessfulApply = (jobId: string) => {
    setAppliedJobs(prev => new Set(prev).add(Number(jobId)));
  };

  // Candidates Modal Logic (From MyJobsScreen)
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const mockCandidates = [
    { id: 1, name: 'Pedro Sánchez', rating: 4.9, reviews: 34, avatar: null },
    { id: 2, name: 'Mario López', rating: 4.5, reviews: 12, avatar: null },
  ];

  const handlePayWorker = () => {
    if (!selectedCandidate) return;
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowCandidatesModal(false);
      navigation.navigate('PaymentSuccess', {
        title: '¡Has contratado a un trabajador!',
        subtitle: 'El pago total ha sido retenido de forma segura. El profesional será notificado para comenzar.',
        type: 'job'
      });
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* HEADER & LOCATION */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.locationSelector} 
          activeOpacity={0.7}
          onPress={() => setIsLocationModalOpen(true)}
        >
          <View style={styles.locationIconBox}>
            <Icon name="MapPin" size={16} color={TOKENS.colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Ubicación de búsqueda</Text>
            <Text style={styles.locationValue} numberOfLines={1}>{location}</Text>
          </View>
          <Icon name="ChevronDown" size={20} color={TOKENS.colors.textSubtle} />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.mainTab, activeTab === 'Ofertas' && styles.mainTabActive]}
          onPress={() => setActiveTab('Ofertas')}
        >
          <Text style={[styles.mainTabText, activeTab === 'Ofertas' && styles.mainTabTextActive]}>Ofertas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mainTab, activeTab === 'Mis Postulaciones' && styles.mainTabActive]}
          onPress={() => setActiveTab('Mis Postulaciones')}
        >
          <Text style={[styles.mainTabText, activeTab === 'Mis Postulaciones' && styles.mainTabTextActive]}>Mis Postulaciones</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mainTab, activeTab === 'Mis Ofertas' && styles.mainTabActive]}
          onPress={() => setActiveTab('Mis Ofertas')}
        >
          <Text style={[styles.mainTabText, activeTab === 'Mis Ofertas' && styles.mainTabTextActive]}>Mis Ofertas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* FILTERS (Only for Ofertas) */}
        {activeTab === 'Ofertas' && (
          <View style={styles.filtersScroll}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
              {['Nuevo', 'Sin Postular', 'Postulado', 'Expirado'].map((f) => (
                <TouchableOpacity 
                  key={f} 
                  onPress={() => setActiveFilter(f as OfferFilter)}
                  style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* LOADING STATE */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
            <Text style={styles.loadingText}>Buscando trabajos en {location}...</Text>
          </View>
        ) : (
          /* LIST FOR OFERTAS OR MIS POSTULACIONES */
          activeTab !== 'Mis Ofertas' && (
            <View style={styles.list}>
              {[1, 2, 3].map((item) => (
                <TouchableOpacity key={item} style={styles.jobCard} activeOpacity={0.8}>
                  <View style={styles.jobHeader}>
                    <View style={styles.clientInfo}>
                      <Avatar uri={null} name={`Cliente ${item}`} size={40} />
                      <View>
                        <Text style={styles.clientName}>Familia González</Text>
                        <Text style={styles.timeAgo}>Publicado hace 2h</Text>
                      </View>
                    </View>
                    {activeTab === 'Ofertas' ? (
                      <Badge label={activeFilter.toUpperCase()} tone={activeFilter === 'Nuevo' ? 'success' : 'neutral'} />
                    ) : (
                      <Badge label="EN REVISIÓN" tone="brand" />
                    )}
                  </View>
                  
                  <Text style={styles.jobTitle}>Se necesita gasfíter para reparación urgente de cañería</Text>

                  <View style={styles.jobDetails}>
                    <View style={styles.detailRow}>
                      <Icon name="Calendar" size={14} color={TOKENS.colors.textSubtle} />
                      <Text style={styles.detailText}>Para hoy</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                      <Text style={styles.detailText}>A 2.5 km de distancia</Text>
                    </View>
                  </View>

                  <View style={styles.jobFooter}>
                    <Text style={styles.priceText}>Presupuesto: <Text style={{ color: TOKENS.colors.textMain }}>$ 45.000</Text></Text>
                    
                    {activeTab === 'Ofertas' && appliedJobs.has(item) ? (
                      <View style={styles.appliedBadge}>
                        <Icon name="CheckCircle2" size={14} color={TOKENS.colors.success700} />
                        <Text style={styles.appliedText}>Postulado</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => activeTab === 'Ofertas' ? handleApplyClick({ id: item, title: 'Se necesita gasfíter para reparación urgente de cañería' }) : null}
                      >
                        <Text style={styles.actionBtnText}>{activeTab === 'Ofertas' ? 'Postular' : 'Ver Detalle'}</Text>
                        <Icon name="ChevronRight" size={16} color={TOKENS.colors.brand600} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* LIST FOR MIS OFERTAS (MyJobsScreen logic) */}
        {activeTab === 'Mis Ofertas' && !isLoading && (
          <View style={styles.list}>
            {[1, 2].map((item) => (
              <View key={item} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <Badge label="ABIERTO" tone="success" />
                  <Text style={styles.timeAgo}>Publicado hace 1 día</Text>
                </View>
                
                <Text style={styles.jobTitle}>Gasfíter para reparación urgente de cañería en baño</Text>
                
                <View style={styles.applicantsBox}>
                  <View style={styles.applicantsAvatars}>
                    <Avatar uri={null} name="P" size={32} />
                    <Avatar uri={null} name="M" size={32} />
                    <View style={styles.moreApplicants}>
                      <Text style={styles.moreApplicantsText}>+3</Text>
                    </View>
                  </View>
                  <Text style={styles.applicantsText}>5 profesionales se han postulado</Text>
                </View>

                <View style={styles.footerActions}>
                  <Button 
                    title="Ver Candidatos" 
                    onPress={() => setShowCandidatesModal(true)} 
                    style={{ flex: 1 }} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CTA FLOATING */}
      <View style={styles.ctaFloat}>
        <Button 
          title="Ofrecer Trabajo" 
          icon="Plus" 
          onPress={() => navigation.navigate('PublishJob')} 
          style={styles.ctaBtn} 
        />
      </View>

      <LocationModal 
        visible={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
        onSelectLocation={handleLocationChange} 
      />

      <ModalApplyJob 
        visible={isApplyModalOpen} 
        onClose={() => setIsApplyModalOpen(false)} 
        job={selectedJob} 
        onSuccessfulApply={handleSuccessfulApply}
      />

      {/* CANDIDATES MODAL */}
      <React.Fragment>
        {showCandidatesModal && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { paddingBottom: insets.bottom || 24 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Candidatos Postulados</Text>
                  <TouchableOpacity onPress={() => setShowCandidatesModal(false)} style={styles.closeBtn}>
                    <Icon name="X" size={24} color={TOKENS.colors.textMain} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>Selecciona al profesional ideal para tu trabajo.</Text>

                <View style={styles.candidatesList}>
                  {mockCandidates.map((candidate) => (
                    <TouchableOpacity 
                      key={candidate.id}
                      style={[
                        styles.candidateCard, 
                        selectedCandidate === candidate.id && styles.candidateCardSelected
                      ]}
                      onPress={() => setSelectedCandidate(candidate.id)}
                      activeOpacity={0.7}
                    >
                      <Avatar uri={candidate.avatar} name={candidate.name} size={48} />
                      <View style={styles.candidateInfo}>
                        <Text style={styles.candidateName}>{candidate.name}</Text>
                        <View style={styles.ratingRow}>
                          <Icon name="Star" size={12} color={TOKENS.colors.starActive} />
                          <Text style={{ fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>{candidate.rating}</Text>
                          <Text style={{ fontSize: 12, color: TOKENS.colors.textSubtle, marginLeft: 4 }}>({candidate.reviews})</Text>
                        </View>
                        <TouchableOpacity 
                          style={{ marginTop: 8 }}
                          onPress={() => {
                            setShowCandidatesModal(false);
                            navigation.navigate('ProviderProfile', { providerId: candidate.id });
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: TOKENS.colors.brand600 }}>Ver Perfil</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.radioCircle}>
                        {selectedCandidate === candidate.id && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total del trabajo a pagar:</Text>
                  <Text style={styles.totalValue}>$45.000</Text>
                </View>

                <Button 
                  title={isProcessingPayment ? "Procesando pago..." : "Contratar y Pagar"} 
                  onPress={handlePayWorker}
                  disabled={!selectedCandidate || isProcessingPayment}
                  style={{ width: '100%' }}
                />
              </View>
            </View>
          </View>
        )}
      </React.Fragment>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  topHeader: {
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    gap: 12,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.textMain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: TOKENS.typography.weights.bold,
  },
  locationValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.white,
    paddingHorizontal: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
  },
  mainTab: {
    flex: 1,
    paddingVertical: TOKENS.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: {
    borderBottomColor: TOKENS.colors.brand500,
  },
  mainTabText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  mainTabTextActive: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.bold,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 160,
  },
  filtersScroll: {
    marginHorizontal: -TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
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
    backgroundColor: TOKENS.colors.textMain,
    borderColor: TOKENS.colors.textMain,
  },
  filterText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  filterTextActive: {
    color: TOKENS.colors.white,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  list: {
    gap: TOKENS.spacing.md,
  },
  jobCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: TOKENS.spacing.sm,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },
  clientName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  timeAgo: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  jobTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
    lineHeight: 22,
  },
  jobDetails: {
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    gap: 8,
    marginBottom: TOKENS.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.medium,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
    paddingTop: TOKENS.spacing.md,
  },
  priceText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  ctaFloat: {
    position: 'absolute',
    bottom: 90, // Above bottom nav
    left: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
  },
  ctaBtn: {
    width: '100%',
    ...TOKENS.shadows.medium,
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.colors.success50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.success200,
  },
  appliedText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.success700,
  },
  applicantsBox: { backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.md },
  applicantsAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  moreApplicants: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.brand100, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 2, borderColor: TOKENS.colors.white },
  moreApplicantsText: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700 },
  applicantsText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: TOKENS.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: TOKENS.spacing.xl, zIndex: 100 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  closeBtn: { padding: 4 },
  modalSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.lg },
  candidatesList: { gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.lg },
  candidateCard: { flexDirection: 'row', alignItems: 'flex-start', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.surface50, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  candidateCardSelected: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  candidateInfo: { flex: 1, marginLeft: 12 },
  candidateName: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TOKENS.colors.brand500 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: TOKENS.colors.surface100, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.lg },
  totalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  totalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.brand600 },
});
