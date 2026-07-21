import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components';
import { useRole } from '../../context/RoleContext';

type SectionState = {
  personal: boolean;
  email: boolean;
  identity: boolean;
  bank: boolean;
};

export const VerificationCenterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { role } = useRole();

  const isProvider = role === 'provider';

  // Completion state
  const [completed, setCompleted] = useState({
    personal: false,
    email: false,
    identity: false,
    bank: false,
  });

  // Accordion state
  const [openSections, setOpenSections] = useState<SectionState>({
    personal: true,
    email: false,
    identity: false,
    bank: false,
  });

  const toggleSection = (key: keyof SectionState) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isFullyComplete = isProvider 
    ? (completed.personal && completed.email && completed.identity && completed.bank)
    : (completed.personal && completed.email);

  const StatusBadge = ({ isCompleted }: { isCompleted: boolean }) => (
    <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
      <Icon name={isCompleted ? "CheckCircle" : "Clock"} size={12} color={isCompleted ? TOKENS.colors.success700 : TOKENS.colors.warning700} />
      <Text style={[styles.statusBadgeText, isCompleted ? styles.statusCompletedText : styles.statusPendingText]}>
        {isCompleted ? "COMPLETADO" : "PENDIENTE"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centro de Verificación</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 20 }]}>
        
        <Text style={styles.pageSubtitle}>
          {isProvider 
            ? "Completa tu perfil profesional para habilitar pagos y aumentar tu visibilidad."
            : "Fortalece tu seguridad y desbloquea operaciones fluidas completando tu perfil."}
        </Text>

        <View style={[styles.summaryBanner, isFullyComplete ? styles.summaryBannerSuccess : styles.summaryBannerPending]}>
          <Icon name="Shield" size={24} color={isFullyComplete ? TOKENS.colors.success600 : TOKENS.colors.brand600} />
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, isFullyComplete && { color: TOKENS.colors.success800 }]}>
              {isFullyComplete ? "Perfil 100% Completo" : "Acción Requerida"}
            </Text>
            <Text style={[styles.summaryDesc, isFullyComplete && { color: TOKENS.colors.success700 }]}>
              {isFullyComplete
                ? "Has completado todos los requisitos. Ya puedes operar sin restricciones."
                : "Aún tienes pasos pendientes. La plataforma limitará ciertas funciones."}
            </Text>
          </View>
        </View>

        {/* 1. Datos Personales */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7}
            disabled={completed.personal}
            onPress={() => toggleSection('personal')}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>1. Datos Personales</Text>
                <StatusBadge isCompleted={completed.personal} />
              </View>
              <Text style={styles.accordionDesc}>Tu identidad básica para el uso de la plataforma.</Text>
            </View>
            <Icon name={openSections.personal ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
          </TouchableOpacity>

          {openSections.personal && !completed.personal && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombres</Text>
                <TextInput style={styles.input} placeholder="Ej: Juan" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apellidos</Text>
                <TextInput style={styles.input} placeholder="Ej: Pérez" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fecha de Nacimiento</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" keyboardType="numeric" />
              </View>
              <Button title="Guardar datos" onPress={() => { setCompleted(prev => ({ ...prev, personal: true })); setOpenSections(prev => ({ ...prev, personal: false, email: true })); }} />
            </View>
          )}
        </View>

        {/* 2. Correo Verificado */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7}
            disabled={completed.email}
            onPress={() => toggleSection('email')}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>2. Correo Verificado</Text>
                <StatusBadge isCompleted={completed.email} />
              </View>
              <Text style={styles.accordionDesc}>Vital para notificaciones y recuperación de cuenta.</Text>
            </View>
            <Icon name={openSections.email ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
          </TouchableOpacity>

          {openSections.email && !completed.email && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de Verificación (Enviado a tu correo)</Text>
                <TextInput style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]} placeholder="XXXXXX" maxLength={6} keyboardType="numeric" />
              </View>
              <Button title="Confirmar código" onPress={() => { setCompleted(prev => ({ ...prev, email: true })); setOpenSections(prev => ({ ...prev, email: false, identity: isProvider })); }} />
              <Button title="Reenviar código" variant="secondary" style={{ marginTop: 8 }} />
            </View>
          )}
        </View>

        {/* Provider Only Sections */}
        {isProvider && (
          <>
            {/* 3. Identidad de Proveedor */}
            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                activeOpacity={0.7}
                disabled={completed.identity}
                onPress={() => toggleSection('identity')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitle}>3. Identidad de Proveedor</Text>
                    <StatusBadge isCompleted={completed.identity} />
                  </View>
                  <Text style={styles.accordionDesc}>Razón social o nombre público con el que operas.</Text>
                </View>
                <Icon name={openSections.identity ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>

              {openSections.identity && !completed.identity && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre Comercial o Público</Text>
                    <TextInput style={styles.input} placeholder="Ej: Reparaciones Rápidas JP" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>RUT del Proveedor</Text>
                    <TextInput style={styles.input} placeholder="12345678-9" />
                  </View>
                  <Button title="Confirmar identidad" onPress={() => { setCompleted(prev => ({ ...prev, identity: true })); setOpenSections(prev => ({ ...prev, identity: false, bank: true })); }} />
                </View>
              )}
            </View>

            {/* 4. Datos Bancarios */}
            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                activeOpacity={0.7}
                disabled={completed.bank}
                onPress={() => toggleSection('bank')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitle}>4. Datos Bancarios</Text>
                    <StatusBadge isCompleted={completed.bank} />
                  </View>
                  <Text style={styles.accordionDesc}>Para depositar tus ganancias.</Text>
                </View>
                <Icon name={openSections.bank ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>

              {openSections.bank && !completed.bank && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Banco</Text>
                    <TextInput style={styles.input} placeholder="Ej: Banco Estado" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tipo de Cuenta</Text>
                    <TextInput style={styles.input} placeholder="Ej: Cuenta RUT" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número de Cuenta</Text>
                    <TextInput style={styles.input} keyboardType="numeric" />
                  </View>
                  <Button title="Guardar cuenta bancaria" onPress={() => { setCompleted(prev => ({ ...prev, bank: true })); setOpenSections(prev => ({ ...prev, bank: false })); }} />
                </View>
              )}
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.white, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.lg },
  pageSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, lineHeight: 22 },
  summaryBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: TOKENS.spacing.md, borderRadius: 16, borderWidth: 1, gap: 12 },
  summaryBannerPending: { backgroundColor: TOKENS.colors.brand50, borderColor: TOKENS.colors.brand200 },
  summaryBannerSuccess: { backgroundColor: TOKENS.colors.success50, borderColor: TOKENS.colors.success200 },
  summaryContent: { flex: 1 },
  summaryTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand800, marginBottom: 4 },
  summaryDesc: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.brand700, lineHeight: 18 },
  
  accordionCard: { backgroundColor: TOKENS.colors.white, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.lg, backgroundColor: TOKENS.colors.white },
  accordionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  accordionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  accordionDesc: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusPending: { backgroundColor: TOKENS.colors.warning50, borderColor: TOKENS.colors.warning200 },
  statusCompleted: { backgroundColor: TOKENS.colors.success50, borderColor: TOKENS.colors.success200 },
  statusBadgeText: { fontSize: 10, fontWeight: TOKENS.typography.weights.bold, letterSpacing: 0.5 },
  statusPendingText: { color: TOKENS.colors.warning700 },
  statusCompletedText: { color: TOKENS.colors.success700 },

  accordionBody: { padding: TOKENS.spacing.lg, paddingTop: 0, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100, marginTop: TOKENS.spacing.sm },
  inputGroup: { marginBottom: TOKENS.spacing.md, gap: 6 },
  label: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  input: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
});
