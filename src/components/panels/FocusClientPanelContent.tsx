import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Button, Card, Badge, ServiceTimeline } from '../ui';
import { usePanel } from '../../context/PanelContext';
import { useRole } from '../../context/RoleContext';

export const FocusClientPanelContent: React.FC = () => {
  const { panelData } = usePanel();
  const { role, setRole } = useRole();
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', lastName: '', email: '', phone: '' });
  const [clientPrice, setClientPrice] = useState(15000);
  const {
    orderState,
    provider,
    etaRemaining,
    distanceRemaining,
    repairSeconds,
    formatTimer,
    setOrderState,
    handleFinishReview,
  } = panelData || {};

  // Review states locally
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const reviewTags = ['Puntual', 'Limpio', 'Eficiente', 'Amable', 'Buen precio'];
  const [recommend, setRecommend] = useState<boolean | null>(null);

  const mockTimelineSteps = [
    { time: '12:45', title: 'Servicio creado', description: 'Hemos recibido tu solicitud.', iconName: 'Check' as any, status: 'completed' as any },
    { time: '12:59', title: 'En camino', description: 'El prestador se dirige a tu ubicación.', iconName: 'Truck' as any, status: 'completed' as any },
    { time: '13:05', title: 'En reparación', description: 'El prestador está realizando el servicio.', iconName: 'Wrench' as any, status: 'current' as any },
    { time: '13:35', title: 'Finalizado', description: 'El servicio ha sido completado.', iconName: 'CheckCircle2' as any, status: 'pending' as any },
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleReviewSubmit = () => {
    if (handleFinishReview) {
      handleFinishReview({
        rating: selectedRating,
        comment: reviewComment,
        tags: selectedTags,
      });
    }
  };

  if (!provider) return null;

  return (
    <View style={styles.container}>
      {/* STATE 1: QUOTE RECEIVED */}
      {orderState === 'QUOTE_RECEIVED' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {showGuestCheckout ? (
            <View>
              <Text style={styles.sheetTitle}>Datos de Facturación y Contacto</Text>
              <Text style={styles.reviewSubtitle}>Completa estos datos para continuar</Text>
              <TextInput
                placeholder="Nombre"
                placeholderTextColor={TOKENS.colors.textMuted}
                value={guestForm.name}
                onChangeText={(text) => setGuestForm({ ...guestForm, name: text })}
                style={styles.guestInput}
              />
              <TextInput
                placeholder="Apellido"
                placeholderTextColor={TOKENS.colors.textMuted}
                value={guestForm.lastName}
                onChangeText={(text) => setGuestForm({ ...guestForm, lastName: text })}
                style={styles.guestInput}
              />
              <TextInput
                placeholder="Correo Electrónico"
                placeholderTextColor={TOKENS.colors.textMuted}
                value={guestForm.email}
                onChangeText={(text) => setGuestForm({ ...guestForm, email: text })}
                keyboardType="email-address"
                style={styles.guestInput}
              />
              <TextInput
                placeholder="Teléfono"
                placeholderTextColor={TOKENS.colors.textMuted}
                value={guestForm.phone}
                onChangeText={(text) => setGuestForm({ ...guestForm, phone: text })}
                keyboardType="phone-pad"
                style={styles.guestInput}
              />
              <Button
                title="Confirmar y Pagar"
                onPress={() => {
                  setRole('client');
                  setOrderState && setOrderState('PAID');
                  setShowGuestCheckout(false);
                }}
                style={{ marginTop: 16 }}
              />
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setShowGuestCheckout(false)}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar uri={provider.avatar} name={provider.name} size={64} />
                  <View style={[styles.sheetHeaderText, { marginLeft: 16 }]}>
                    <Text style={styles.sheetTitle}>{provider.name}</Text>
                    <View style={styles.ratingRow}>
                      <Rating rating={provider.rating} size={14} showText textSuffix="reseñas" reviewsCount={120} />
                      <Icon name="CheckCircle2" size={14} color={TOKENS.colors.statusSuccess} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setOrderState && setOrderState('CHAT')} style={styles.chatIconBtnSmall}>
                    <Icon name="MessageSquare" size={20} color={TOKENS.colors.brand500} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Icon name="Clock" size={16} color={TOKENS.colors.textSubtle} />
                  <Text style={styles.infoLabel}>Llegada estimada</Text>
                  <Text style={styles.infoValue}>15 - 25 min</Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="MapPin" size={16} color={TOKENS.colors.textSubtle} />
                  <Text style={styles.infoLabel}>Distancia</Text>
                  <Text style={styles.infoValue}>0,8 km</Text>
                </View>
              </View>

              <View style={styles.serviceDetail}>
                <Text style={styles.serviceDetailTitle}>Servicio</Text>
                <Text style={styles.serviceDetailName}>Apertura de puertas</Text>
                <Text style={styles.serviceDetailDesc}>Incluye: Apertura sin daño, servicio 24/7, herramientas especializadas</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Cotización total</Text>
                <View style={styles.priceAdjusterRow}>
                  <TouchableOpacity onPress={() => setClientPrice((p) => Math.max(5000, p - 1000))} style={styles.adjusterBtnSmall}>
                    <Icon name="Minus" size={20} color={TOKENS.colors.textMain} />
                  </TouchableOpacity>
                  <Text style={styles.priceValue}>${clientPrice.toLocaleString('es-CL')}</Text>
                  <TouchableOpacity onPress={() => setClientPrice((p) => p + 1000)} style={styles.adjusterBtnSmall}>
                    <Icon name="Plus" size={20} color={TOKENS.colors.textMain} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ gap: 12 }}>
                <Button
                  title={clientPrice !== 15000 ? "Enviar cotización" : "Pagar ahora"}
                  onPress={() => {
                    if (clientPrice !== 15000) {
                      setOrderState && setOrderState('WAITING_PROVIDER_RESPONSE');
                    } else if (role === 'guest') {
                      setShowGuestCheckout(true);
                    } else {
                      setOrderState && setOrderState('PAID');
                    }
                  }}
                  style={styles.payBtn}
                />
                <Button
                  title="Cancelar orden"
                  variant="outline"
                  onPress={() => {}}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* STATE 2: WAITING PROVIDER */}
      {orderState === 'WAITING_PROVIDER_RESPONSE' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.waitingContainer}>
            <Icon name="Clock" size={48} color={TOKENS.colors.brand500} />
            <Text style={styles.waitingTitle}>Cotización enviada</Text>
            <Text style={styles.waitingDesc}>Esperando respuesta del profesional...</Text>
            
            <TouchableOpacity onPress={() => setOrderState && setOrderState('QUOTE_RECEIVED')} style={styles.bypassBtn}>
              <Text style={styles.bypassBtnText}>Simular profesional rechaza/contraoferta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* STATE 3: PAID / EN ROUTE */}
      {orderState === 'PAID' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.routeHeader}>
            <Text style={styles.sheetTitle}>Tu prestador va en camino</Text>
          </View>

          <View style={styles.etaContainer}>
            <Text style={styles.etaLabel}>Tiempo estimado de llegada</Text>
            <Text style={styles.etaVal}>12 min</Text>
          </View>

          <View style={styles.providerCardRoute}>
            <View style={styles.vehicleImagePlaceholder}>
              <Icon name="Truck" size={32} color={TOKENS.colors.textSubtle} />
            </View>
            <View style={styles.providerCardRouteInfo}>
              <Text style={styles.vehicleLabel}>Vehículo</Text>
              <Text style={styles.vehicleValue}>Hyundai Porter</Text>
            </View>
            <View style={styles.providerCardRouteInfo}>
              <Text style={styles.vehicleLabel}>Patente</Text>
              <Text style={styles.vehicleValue}>JK-CL-32</Text>
            </View>
          </View>

          {/* Developer simulator bypass button */}
          <TouchableOpacity onPress={() => setOrderState && setOrderState('START_REPAIR')} style={styles.bypassBtn}>
            <Text style={styles.bypassBtnText}>Simular llegada del profesional</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STATE 4: PROVIDER ARRIVED */}
      {orderState === 'START_REPAIR' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.routeHeader}>
            <Badge label="LLEGÓ" tone="success" />
            <Text style={styles.etaText}>Listo para iniciar</Text>
          </View>

          <View style={styles.providerCardRoute}>
            <Avatar uri={provider.avatar} name={provider.name} size={48} />
            <View style={styles.providerCardRouteInfo}>
              <Text style={styles.providerNameText}>{provider.name}</Text>
              <Text style={styles.providerVehicleText}>Se encuentra afuera de tu domicilio</Text>
            </View>
          </View>

          <Button
            title="Confirmar inicio de reparación"
            onPress={() => setOrderState && setOrderState('IN_PROGRESS')}
            style={styles.confirmStartBtn}
          />
        </ScrollView>
      )}

      {orderState === 'IN_PROGRESS' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sheetTitle}>Tu servicio está en curso</Text>
            <Text style={{ color: TOKENS.colors.brand500, fontWeight: 'bold', fontSize: 12 }}>Solicitud #TF251650</Text>
          </View>

          <View style={styles.providerCardRoute}>
            <Avatar uri={provider.avatar} name={provider.name} size={48} />
            <View style={styles.providerCardRouteInfo}>
              <Text style={styles.providerNameText}>{provider.name}</Text>
              <View style={styles.ratingRow}>
                <Rating rating={provider.rating} size={10} showText textSuffix={`(${provider.reviewsCount} reseñas)`} />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${provider.phone}`)}
              style={styles.phoneCallBtn}
            >
              <Icon name="Phone" size={18} color={TOKENS.colors.brand500} />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: 12, color: TOKENS.colors.textMain, textAlign: 'center', marginBottom: 16 }}>
            Llegada estimada: 15 - 25 min
          </Text>

          <Text style={{ fontSize: 14, fontWeight: 'bold', color: TOKENS.colors.textMain }}>Estado del servicio</Text>
          <ServiceTimeline steps={mockTimelineSteps} />

          <Button
            title="Contactar al prestador"
            variant="outline"
            onPress={() => {}}
            style={{ width: '100%', marginBottom: 12 }}
          />

          <TouchableOpacity onPress={() => setOrderState && setOrderState('CALIFICAR')} style={styles.bypassBtn}>
            <Text style={styles.bypassBtnText}>Simular fin de servicio</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {orderState === 'CALIFICAR' && (
        <ScrollView contentContainerStyle={styles.reviewSheetBody}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={styles.reviewTitle}>¡Servicio finalizado!</Text>
            <Text style={styles.reviewSubtitle}>Cuéntanos tu experiencia</Text>
          </View>

          <View style={styles.providerCardRoute}>
            <Avatar uri={provider.avatar} name={provider.name} size={48} />
            <View style={styles.providerCardRouteInfo}>
              <Text style={styles.providerNameText}>{provider.name}</Text>
              <View style={styles.ratingRow}>
                <Rating rating={provider.rating} size={10} showText textSuffix={`(120)`} />
              </View>
            </View>
          </View>

          <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: TOKENS.colors.textMain }}>Califica tu experiencia</Text>
          <Rating
            rating={selectedRating}
            onRatingChange={setSelectedRating}
            size={36}
            style={styles.reviewRatingStars}
          />

          <Text style={styles.tagLabel}>Escribe tu reseña (opcional)</Text>
          <TextInput
            placeholder="Excelente servicio, llegó rápido..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
            style={styles.reviewTextarea}
          />

          <Text style={styles.tagLabel}>¿Recomendarías este servicio?</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <Button
              title="Sí"
              variant={recommend === true ? 'primary' : 'outline'}
              onPress={() => setRecommend(true)}
              style={{ flex: 1 }}
            />
            <Button
              title="No"
              variant={recommend === false ? 'primary' : 'outline'}
              onPress={() => setRecommend(false)}
              style={{ flex: 1 }}
            />
          </View>

          <Button
            title="Finalizar y enviar reseña"
            onPress={handleReviewSubmit}
            style={styles.submitReviewBtn}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: TOKENS.spacing.md,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.md,
  },
  infoRow: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  infoValue: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.bold,
  },
  serviceDetail: {
    marginBottom: TOKENS.spacing.md,
  },
  serviceDetailTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: 4,
  },
  serviceDetailName: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.bold,
    marginBottom: 2,
  },
  serviceDetailDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  priceLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
  },
  priceValue: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtn: {
    flex: 1,
  },
  routeHeader: {
    marginBottom: TOKENS.spacing.md,
  },
  etaContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  etaLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  etaVal: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  providerCardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: TOKENS.spacing.md,
  },
  vehicleImagePlaceholder: {
    width: 60,
    height: 40,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  providerCardRouteInfo: {
    flex: 1,
  },
  vehicleLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  vehicleValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  bypassBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  bypassBtnText: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
    textDecorationLine: 'underline',
  },
  confirmStartBtn: {
    width: '100%',
    marginTop: 12,
  },
  timerHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerVal: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    marginTop: 2,
  },
  workingDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  confirmFinishedBtn: {
    width: '100%',
  },
  reviewSheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  reviewTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: 2,
  },
  reviewRatingStars: {
    alignSelf: 'center',
    marginVertical: TOKENS.spacing.md,
  },
  tagLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: 'bold',
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: TOKENS.spacing.md,
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  tagItemActive: {
    backgroundColor: TOKENS.colors.brand100,
    borderColor: TOKENS.colors.brand500,
  },
  tagText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: '500',
  },
  tagTextActive: {
    color: TOKENS.colors.brand600,
    fontWeight: 'bold',
  },
  reviewTextarea: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: 10,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 12,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  submitReviewBtn: {
    width: '100%',
  },
  guestInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: 12,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    marginTop: 12,
  },
  priceAdjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adjusterBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIconBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  waitingTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  waitingDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
  },
});
