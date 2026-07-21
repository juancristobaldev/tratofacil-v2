import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Card, Button, Input } from '../../components';

interface FaqItem { question: string; answer: string; }

const FAQ_ITEMS: FaqItem[] = [
  { question: '¿Cómo funciona TratoFácil?', answer: 'TratoFácil te conecta en tiempo real con profesionales técnicos (gasfiteros, electricistas, etc) de tu comuna. Buscas la categoría, seleccionas al profesional, negocias tarifas mediante chat, y una vez finalizado el trabajo, confirmas el pago.' },
  { question: '¿Es seguro contratar a través de la aplicación?', answer: 'Sí. Todos los proveedores de servicios pasan por un riguroso proceso de verificación que incluye verificación de identidad, certificados policiales y, en caso de electricistas o gasfiteros, su acreditación oficial SEC.' },
  { question: '¿Qué formas de pago aceptan?', answer: 'Aceptamos pagos a través de tarjetas de crédito, débito (Redcompra) y transferencias directas de forma completamente integrada en la app para proteger tu dinero hasta que el servicio esté terminado.' },
  { question: '¿Cómo puedo cancelar un servicio solicitado?', answer: 'Puedes cancelar un servicio sin costo alguno antes de que el profesional acepte la cotización. Si el profesional ya se encuentra en camino, se podría aplicar una tarifa de cancelación mínima para cubrir el traslado.' },
];

export const SupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredFaq = FAQ_ITEMS.filter((item) =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setMessage(''); Alert.alert('Soporte', 'Tu ticket de soporte ha sido enviado exitosamente.'); }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBarContainer}>
          <Icon name="Search" size={18} color={TOKENS.colors.brand500} style={styles.searchIcon} />
          <TextInput placeholder="Buscar soluciones en ayuda..." placeholderTextColor={TOKENS.colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} />
        </View>
        <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
        <View style={styles.faqList}>
          {filteredFaq.length === 0 ? (
            <Text style={styles.noResultsText}>No encontramos resultados para tu búsqueda.</Text>
          ) : (
            filteredFaq.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Card key={idx} style={styles.faqCard} padded={false}>
                  <TouchableOpacity onPress={() => setOpenFaq(isOpen ? null : idx)} style={styles.faqQuestionRow} activeOpacity={0.7}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color={TOKENS.colors.textSubtle} />
                  </TouchableOpacity>
                  {isOpen && (<View style={styles.faqAnswerContainer}><Text style={styles.faqAnswer}>{item.answer}</Text></View>)}
                </Card>
              );
            })
          )}
        </View>
        <Text style={styles.sectionTitle}>Contáctanos</Text>
        <Card style={styles.contactFormCard}>
          <Text style={styles.contactFormTitle}>¿No encontraste solución?</Text>
          <Text style={styles.contactFormSub}>Déjanos tu mensaje y un agente de TratoFácil te responderá al correo.</Text>
          <TextInput placeholder="Describe tu consulta o inconveniente en detalle..." placeholderTextColor={TOKENS.colors.textMuted} value={message} onChangeText={setMessage} multiline style={styles.textarea} />
          <Button title="Enviar mensaje" onPress={handleSubmitTicket} loading={submitting} disabled={!message.trim()} style={styles.submitBtn} />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, paddingBottom: 40, gap: TOKENS.spacing.md },
  searchBarContainer: { height: 48, backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusInput, borderWidth: 1, borderColor: TOKENS.colors.surface200, flexDirection: 'row', alignItems: 'center', paddingHorizontal: TOKENS.spacing.md, ...TOKENS.shadows.soft },
  searchIcon: { marginRight: TOKENS.spacing.sm },
  searchInput: { flex: 1, color: TOKENS.colors.textMain, fontSize: TOKENS.typography.sizes.sm, height: '100%', padding: 0 },
  sectionTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle, marginTop: TOKENS.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  faqList: { gap: TOKENS.spacing.sm },
  faqCard: { backgroundColor: TOKENS.colors.white },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.md },
  faqQuestion: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, flex: 1, marginRight: 16 },
  faqAnswerContainer: { paddingHorizontal: TOKENS.spacing.md, paddingBottom: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100, paddingTop: TOKENS.spacing.sm },
  faqAnswer: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18, fontWeight: TOKENS.typography.weights.medium },
  noResultsText: { textAlign: 'center', color: TOKENS.colors.textSubtle, fontSize: TOKENS.typography.sizes.xs, paddingVertical: 12 },
  contactFormCard: { backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md },
  contactFormTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  contactFormSub: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2, marginBottom: TOKENS.spacing.md, lineHeight: 14 },
  textarea: { width: '100%', height: 100, backgroundColor: TOKENS.colors.surface50, borderColor: TOKENS.colors.surface200, borderWidth: 1, borderRadius: 12, padding: 10, fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textMain, textAlignVertical: 'top', marginBottom: TOKENS.spacing.md },
  submitBtn: { width: '100%' },
});
