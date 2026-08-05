import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Badge, Button, ErrorState } from '../ui';
import { LocationModal } from '../ui/LocationModal';
import { ModalApplyJob } from '../ui/ModalApplyJob';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJobs } from '../../hooks/useJobs';
import { useFlow } from '../../hooks/useFlow';
import { WEB_CALLBACK_URL } from '../../config/endpoints';
import { useRefresh } from '../../context/RefreshContext';
import type { Job, JobApplication } from '../../types/graphql';

type JobTabMode = 'Ofertas' | 'Mis Postulaciones' | 'Mis Ofertas';

export const JobsTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    jobs,
    jobsLoading,
    jobsError,
    refetchJobs,
    myApplications,
    myJobs,
    myJobsLoading,
    myJobsError,
    applyToJob,
    createOrder,
    refetchMyJobs,
  } = useJobs();
  const { pay } = useFlow();

  const { setIsRefreshing } = useRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchJobs();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchJobs, setIsRefreshing]);

  const [activeTab, setActiveTab] = useState<JobTabMode>('Ofertas');
  const [location, setLocation] = useState('Providencia, RM');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

  const handleLocationChange = (newLocation: string) => {
    setIsLocationModalOpen(false);
    setLocation(newLocation);
  };

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setIsApplyModalOpen(true);
  };

  const handleSuccessfulApply = (jobId: string) => {
    const id = parseInt(jobId, 10);
    applyToJob(id).then(() => {
      setAppliedIds((prev) => new Set(prev).add(Number(jobId)));
    }).catch(() => {
      Alert.alert('Error', 'No se pudo postular al trabajo.');
    });
  };

  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedJobForCandidates, setSelectedJobForCandidates] = useState<Job | null>(null);
  const [selectedCandidateWorkerId, setSelectedCandidateWorkerId] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayWorker = async () => {
    if (!selectedCandidateWorkerId || !selectedJobForCandidates) return;
    setIsProcessingPayment(true);
    try {
      const order = await createOrder({
        jobId: selectedJobForCandidates.id,
        total: selectedJobForCandidates.price || 0,
      });
      const result = await pay({
        type: 'job',
        orderId: order.id,
        returnUrl: `${WEB_CALLBACK_URL}?type=job&source=mobile`,
      });
      setShowCandidatesModal(false);
      navigation.navigate('PaymentSuccess', {
        title: 'Has contratado a un trabajador!',
        subtitle: 'El pago ha sido procesado. El profesional será notificado.',
        type: 'job',
        flowUrl: result.url,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo procesar el pago.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

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

      <View style={styles.tabsRow}>
        {(['Ofertas', 'Mis Postulaciones', 'Mis Ofertas'] as JobTabMode[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.mainTab, activeTab === tab && styles.mainTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.mainTabText, activeTab === tab && styles.mainTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>

        {activeTab === 'Ofertas' && (
          <>
            {jobsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
                <Text style={styles.loadingText}>Buscando trabajos...</Text>
              </View>
            ) : jobsError ? (
              <ErrorState
                message="No se pudieron cargar los trabajos. Revisa tu conexión e intenta nuevamente."
                onRetry={() => refetchJobs()}
              />
            ) : jobs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="Briefcase" size={48} color={TOKENS.colors.textMuted} />
                <Text style={styles.emptyTitle}>No hay trabajos disponibles</Text>
                <Text style={styles.emptySubtitle}>Sé el primero en publicar uno.</Text>
              </View>
            ) : (
              <FlashList
                data={jobs}
                keyExtractor={(j) => String(j.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
                contentContainerStyle={styles.scrollContent}
                ItemSeparatorComponent={() => <View style={{ height: TOKENS.spacing.md }} />}
                renderItem={({ item: job }) => (
                  <TouchableOpacity style={styles.jobCard} activeOpacity={0.8}>
                    <View style={styles.jobHeader}>
                      <View style={styles.clientInfo}>
                        <Avatar uri={null} name={job.user?.displayName || 'C'} size={40} />
                        <View>
                          <Text style={styles.clientName}>{job.user?.displayName || 'Cliente'}</Text>
                          <Text style={styles.timeAgo}>{new Date(job.createdAt).toLocaleDateString('es-CL')}</Text>
                        </View>
                      </View>
                      <Badge label="NUEVO" tone="success" />
                    </View>

                    <Text style={styles.jobTitle}>{job.title}</Text>

                    <View style={styles.jobDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="Calendar" size={14} color={TOKENS.colors.textSubtle} />
                        <Text style={styles.detailText}>{new Date(job.createdAt).toLocaleDateString('es-CL')}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                        <Text style={styles.detailText}>{job.location || location}</Text>
                      </View>
                    </View>

                    <View style={styles.jobFooter}>
                      <Text style={styles.priceText}>
                        Presupuesto: <Text style={{ color: TOKENS.colors.textMain }}>${(job.price || 0).toLocaleString('es-CL')}</Text>
                      </Text>

                      {appliedIds.has(job.id) ? (
                        <View style={styles.appliedBadge}>
                          <Icon name="CheckCircle" size={14} color={TOKENS.colors.statusSuccess} />
                          <Text style={styles.appliedText}>Postulado</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleApplyClick(job)}
                        >
                          <Text style={styles.actionBtnText}>Postular</Text>
                          <Icon name="ChevronRight" size={16} color={TOKENS.colors.brand600} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}

        {activeTab === 'Mis Postulaciones' && (
          <FlashList
            data={myApplications}
            keyExtractor={(a) => String(a.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
            contentContainerStyle={styles.scrollContent}
            ItemSeparatorComponent={() => <View style={{ height: TOKENS.spacing.md }} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Icon name="FileText" size={48} color={TOKENS.colors.textMuted} />
                <Text style={styles.emptyTitle}>No te has postulado aún</Text>
                <Text style={styles.emptySubtitle}>Explora trabajos disponibles.</Text>
              </View>
            }
            renderItem={({ item: app }) => (
                <View style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View style={styles.clientInfo}>
                      <Avatar uri={null} name={app.job?.user?.displayName || 'C'} size={40} />
                      <View>
                        <Text style={styles.clientName}>{app.job?.user?.displayName || 'Cliente'}</Text>
                        <Text style={styles.timeAgo}>Postulado</Text>
                      </View>
                    </View>
                    <Badge label={app.status === 'PENDING' ? 'EN REVISIÓN' : app.status} tone="brand" />
                  </View>
                  <Text style={styles.jobTitle}>{app.job?.title || 'Trabajo'}</Text>
                  <View style={styles.jobDetails}>
                    <View style={styles.detailRow}>
                      <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                      <Text style={styles.detailText}>{app.job?.location || ''}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Icon name="DollarSign" size={14} color={TOKENS.colors.textSubtle} />
                      <Text style={styles.detailText}>${(app.job?.price || 0).toLocaleString('es-CL')}</Text>
                    </View>
                  </View>
                </View>
            )}
          />
        )}

        {activeTab === 'Mis Ofertas' && (
          <>
            {myJobsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
              </View>
            ) : myJobsError ? (
              <ErrorState
                message="No se pudieron cargar tus ofertas."
                onRetry={() => refetchMyJobs()}
              />
            ) : myJobs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="Briefcase" size={48} color={TOKENS.colors.textMuted} />
                <Text style={styles.emptyTitle}>No has publicado trabajos</Text>
                <Text style={styles.emptySubtitle}>Publica uno para recibir postulaciones.</Text>
              </View>
            ) : (
              <FlashList
                data={myJobs}
                keyExtractor={(j) => String(j.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
                contentContainerStyle={styles.scrollContent}
                ItemSeparatorComponent={() => <View style={{ height: TOKENS.spacing.md }} />}
                renderItem={({ item: job }) => {
                  const hasApplications = (job.applications?.length || 0) > 0;
                  return (
                    <View style={styles.jobCard}>
                      <View style={styles.jobHeader}>
                        <Badge label="ABIERTO" tone="success" />
                        <Text style={styles.timeAgo}>{new Date(job.createdAt).toLocaleDateString('es-CL')}</Text>
                      </View>

                      <Text style={styles.jobTitle}>{job.title}</Text>

                      {hasApplications ? (
                        <View style={styles.applicantsBox}>
                          <View style={styles.applicantsAvatars}>
                            {job.applications!.slice(0, 3).map((app) => (
                              <Avatar key={app.id} uri={null} name={app.worker?.displayName?.[0] || 'U'} size={32} />
                            ))}
                            {job.applications!.length > 3 && (
                              <View style={styles.moreApplicants}>
                                <Text style={styles.moreApplicantsText}>+{job.applications!.length - 3}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.applicantsText}>{job.applications!.length} profesionales se han postulado</Text>
                        </View>
                      ) : (
                        <Text style={styles.timeAgo}>Sin postulaciones aún</Text>
                      )}

                      <View style={styles.footerActions}>
                        <Button
                          title="Ver Candidatos"
                          onPress={() => {
                            setSelectedJobForCandidates(job);
                            setShowCandidatesModal(true);
                          }}
                          style={{ flex: 1 }}
                          disabled={!hasApplications}
                        />
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </>
        )}
      </View>

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

      {showCandidatesModal && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom || 24 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Candidatos Postulados</Text>
                <TouchableOpacity onPress={() => { setShowCandidatesModal(false); setSelectedCandidateWorkerId(null); }} style={styles.closeBtn}>
                  <Icon name="X" size={24} color={TOKENS.colors.textMain} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Selecciona al profesional ideal para tu trabajo.</Text>

              <View style={styles.candidatesList}>
                {(selectedJobForCandidates?.applications || []).map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[styles.candidateCard, selectedCandidateWorkerId === app.workerId && styles.candidateCardSelected]}
                    onPress={() => setSelectedCandidateWorkerId(app.workerId)}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={null} name={app.worker?.displayName || 'U'} size={48} />
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>{app.worker?.displayName || 'Usuario'}</Text>
                      <TouchableOpacity
                        style={{ marginTop: 8 }}
                        onPress={() => {
                          setShowCandidatesModal(false);
                          navigation.navigate('ProviderProfile', { providerId: app.workerId });
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: TOKENS.colors.brand600 }}>Ver Perfil</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.radioCircle}>
                      {selectedCandidateWorkerId === app.workerId && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total del trabajo a pagar:</Text>
                <Text style={styles.totalValue}>${(selectedJobForCandidates?.price || 0).toLocaleString('es-CL')}</Text>
              </View>

              <Button
                title={isProcessingPayment ? 'Procesando pago...' : 'Contratar y Pagar'}
                onPress={handlePayWorker}
                disabled={!selectedCandidateWorkerId || isProcessingPayment}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  topHeader: { padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.white, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.sm, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200, gap: 12 },
  locationIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: TOKENS.colors.textMain, alignItems: 'center', justifyContent: 'center' },
  locationLabel: { fontSize: 10, color: TOKENS.colors.textSubtle, textTransform: 'uppercase', fontWeight: TOKENS.typography.weights.bold },
  locationValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.white, paddingHorizontal: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  mainTab: { flex: 1, paddingVertical: TOKENS.spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabActive: { borderBottomColor: TOKENS.colors.brand500 },
  mainTabText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  mainTabTextActive: { color: TOKENS.colors.brand600, fontWeight: TOKENS.typography.weights.bold },
  scrollContent: { padding: TOKENS.spacing.md, paddingBottom: 160 },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.medium },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginTop: 16 },
  emptySubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginTop: 4 },
  list: { gap: TOKENS.spacing.md },
  jobCard: { backgroundColor: TOKENS.colors.white, borderRadius: 20, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: TOKENS.spacing.sm },
  clientInfo: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.spacing.sm },
  clientName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  timeAgo: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 2 },
  jobTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md, lineHeight: 22 },
  jobDetails: { backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, gap: 8, marginBottom: TOKENS.spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.medium },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100, paddingTop: TOKENS.spacing.md },
  priceText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand600 },
  ctaFloat: { position: 'absolute', bottom: 90, left: TOKENS.spacing.md, right: TOKENS.spacing.md },
  ctaBtn: { width: '100%' },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TOKENS.colors.statusSuccess + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: TOKENS.colors.statusSuccess + '33' },
  appliedText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.statusSuccess },
  applicantsBox: { backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.md },
  applicantsAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  moreApplicants: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.brand100, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 2, borderColor: TOKENS.colors.white },
  moreApplicantsText: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700 },
  applicantsText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  footerActions: { marginTop: TOKENS.spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: TOKENS.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: TOKENS.spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  closeBtn: { padding: 4 },
  modalSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.lg },
  candidatesList: { gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.lg },
  candidateCard: { flexDirection: 'row', alignItems: 'flex-start', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.surface50, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  candidateCardSelected: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  candidateInfo: { flex: 1, marginLeft: 12 },
  candidateName: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TOKENS.colors.brand500 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: TOKENS.colors.surface100, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.lg },
  totalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  totalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.brand600 },
});
