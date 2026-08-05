import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal as RNModal, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Badge, Button, Rating, EmptyState, ErrorState } from '../../components';
import { useJobs } from '../../hooks/useJobs';

type TabMode = 'Activos' | 'Finalizados';

export const MyJobsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabMode>('Activos');
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const {
    myJobs: jobs,
    myJobsLoading: loading,
    myJobsError: error,
    refetchMyJobs: refetch,
  } = useJobs();

  const activeJobs = jobs.filter((j) => j.orders?.every((o) => o.status !== 'COMPLETED'));
  const finishedJobs = jobs.filter((j) => j.orders?.some((o) => o.status === 'COMPLETED'));

  const handlePayWorker = () => {
    if (!selectedCandidate || !selectedJobId) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowCandidatesModal(false);
      navigation.navigate('PaymentSuccess', {
        title: '¡Has contratado a un trabajador!',
        subtitle: 'El profesional será notificado para comenzar.',
        type: 'job',
      });
    }, 2000);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TOKENS.colors.brand500} /></View>;
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar tus trabajos." onRetry={() => refetch()} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Trabajos Publicados</Text>
        <Text style={styles.headerSubtitle}>Gestiona tus ofertas y evalúa a los profesionales.</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'Activos' && styles.mainTabActive]}
          onPress={() => setActiveTab('Activos')}
        >
          <Text style={[styles.mainTabText, activeTab === 'Activos' && styles.mainTabTextActive]}>Activos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'Finalizados' && styles.mainTabActive]}
          onPress={() => setActiveTab('Finalizados')}
        >
          <Text style={[styles.mainTabText, activeTab === 'Finalizados' && styles.mainTabTextActive]}>Finalizados</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'Activos' && (
          <FlashList
            data={activeJobs}
            contentContainerStyle={styles.scrollContent}
            ItemSeparatorComponent={() => <View style={{ height: TOKENS.spacing.md }} />}
            ListEmptyComponent={<EmptyState icon="Briefcase" title="Sin trabajos activos" description="Publica un trabajo para recibir postulaciones." />}
            renderItem={({ item: job }) => (
              <View style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <Badge label="ABIERTO" tone="success" />
                  <Text style={styles.timeAgo}>{new Date(job.createdAt).toLocaleDateString('es-CL')}</Text>
                </View>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.applicantsBox}>
                  <View style={styles.applicantsAvatars}>
                    {job.applications?.slice(0, 2).map((app) => (
                      <Avatar key={app.id} uri={null} name={app.worker.displayName || 'U'} size={32} />
                    ))}
                    {(job.applications?.length || 0) > 2 && (
                      <View style={styles.moreApplicants}>
                        <Text style={styles.moreApplicantsText}>+{job.applications!.length - 2}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.applicantsText}>
                    {job.applications?.length || 0} profesionales se han postulado
                  </Text>
                </View>
                <View style={styles.footerActions}>
                  <Button
                    title="Ver Candidatos"
                    onPress={() => {
                      setSelectedJobId(job.id);
                      setShowCandidatesModal(true);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          />
        )}

        {activeTab === 'Finalizados' && (
          <FlashList
            data={finishedJobs}
            contentContainerStyle={styles.scrollContent}
            ItemSeparatorComponent={() => <View style={{ height: TOKENS.spacing.md }} />}
            ListEmptyComponent={<EmptyState icon="CheckCircle" title="Sin trabajos finalizados" description="Los trabajos completados aparecerán aquí." />}
            renderItem={({ item: job }) => {
              const completedOrder = job.orders?.find((o) => o.status === 'COMPLETED');
              return (
                <View style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Badge label="FINALIZADO" tone="neutral" />
                    <Text style={styles.timeAgo}>{new Date(job.createdAt).toLocaleDateString('es-CL')}</Text>
                  </View>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  {completedOrder?.worker && (
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerLabel}>Trabajo realizado por:</Text>
                      <View style={styles.workerRow}>
                        <Avatar uri={null} name={completedOrder.worker.displayName || 'T'} size={40} />
                        <View>
                          <Text style={styles.workerName}>{completedOrder.worker.displayName}</Text>
                          <Text style={styles.workerSkill}>Profesional</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  <View style={styles.footerActions}>
                    <Button title="Evaluar Trabajo" icon="Star" onPress={() => {}} style={{ flex: 1 }} />
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <RNModal visible={showCandidatesModal} transparent animationType="slide">
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
              {jobs
                .find((j) => j.id === selectedJobId)
                ?.applications?.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.candidateCard,
                      selectedCandidate === app.worker.id && styles.candidateCardSelected,
                    ]}
                    onPress={() => setSelectedCandidate(app.worker.id)}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={null} name={app.worker.displayName || 'U'} size={48} />
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>{app.worker.displayName}</Text>
                      {app.message ? <Text style={{ fontSize: 12, color: TOKENS.colors.textSubtle }}>{app.message}</Text> : null}
                    </View>
                    <View style={styles.radioCircle}>
                      {selectedCandidate === app.worker.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total del trabajo a pagar:</Text>
              <Text style={styles.totalValue}>
                ${(jobs.find((j) => j.id === selectedJobId)?.price || 0).toLocaleString('es-CL')}
              </Text>
            </View>

            <Button
              title={isProcessing ? 'Procesando pago...' : 'Contratar y Pagar'}
              onPress={handlePayWorker}
              disabled={!selectedCandidate || isProcessing}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
  header: { padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.white },
  headerTitle: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  headerSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginTop: 4 },
  tabsRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.white, paddingHorizontal: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  mainTab: { flex: 1, paddingVertical: TOKENS.spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabActive: { borderBottomColor: TOKENS.colors.brand500 },
  mainTabText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  mainTabTextActive: { color: TOKENS.colors.brand600, fontWeight: TOKENS.typography.weights.bold },
  scrollContent: { padding: TOKENS.spacing.md, paddingBottom: 100 },
  jobCard: { backgroundColor: TOKENS.colors.white, borderRadius: 20, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: TOKENS.spacing.md },
  timeAgo: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  jobTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md, lineHeight: 22 },
  applicantsBox: { backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.md },
  applicantsAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  moreApplicants: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.brand100, alignItems: 'center', justifyContent: 'center', marginLeft: -8, borderWidth: 2, borderColor: TOKENS.colors.white },
  moreApplicantsText: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700 },
  applicantsText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  workerInfo: { backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.md },
  workerLabel: { fontSize: 10, color: TOKENS.colors.textSubtle, textTransform: 'uppercase', fontWeight: TOKENS.typography.weights.bold, marginBottom: 8 },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  workerSkill: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 2 },
  footerActions: { flexDirection: 'row', gap: TOKENS.spacing.md, paddingTop: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: TOKENS.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: TOKENS.spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  closeBtn: { padding: 4 },
  modalSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.lg },
  candidatesList: { gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.lg },
  candidateCard: { flexDirection: 'row', alignItems: 'center', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.surface50, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  candidateCardSelected: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  candidateInfo: { flex: 1, marginLeft: 12 },
  candidateName: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: TOKENS.colors.brand500 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: TOKENS.colors.surface100, padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.lg },
  totalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  totalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.brand600 },
});
