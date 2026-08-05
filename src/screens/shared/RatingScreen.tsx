import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  Pressable,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge, Rating } from '../../components/ui';
import { usePanel } from '../../context/PanelContext';
import { useRole } from '../../context/RoleContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';

export const RatingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { clearPanel } = usePanel();
  const { role: userRole } = useRole();
  const { createProviderReview, createClientReview } = useTimeRealServices();

  const {
    role = 'client',
    targetUser = {},
    serviceDetails = '',
    amount = 0,
    address = '',
    paymentMethod = '-',
    orderRealtimeId,
    providerId,
    clientId,
  } = route.params || {};

  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    const backAction = () => {
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleSubmit = async () => {
    try {
      if (role === 'client' && orderRealtimeId && providerId) {
        await createProviderReview({
          rating: selectedRating,
          comment: reviewComment || undefined,
          orderRealtimeId,
          providerId,
        });
      } else if (role === 'provider' && orderRealtimeId && clientId) {
        await createClientReview({
          rating: selectedRating,
          comment: reviewComment || undefined,
          orderRealtimeId,
          clientId,
        });
      }
    } catch (_err) {
      // Review submission is best-effort, don't block the flow
    }
    clearPanel();
    navigation.navigate('ServiceSuccess');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.mainTitle}>¡Trabajo Terminado y Verificado!</Text>

        {/* Card 1: Resumen de Trabajo */}
        <Card style={styles.card} padded={true}>
          <Text style={styles.cardTitle}>Resumen del Trabajo</Text>
          <View style={styles.profileRow}>
            {targetUser.avatar ? (
              <Image source={{ uri: targetUser.avatar }} style={styles.avatar} />
            ) : null}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{targetUser.name}</Text>
                {role === 'client' && <Badge label="Top Pro" tone="brand" size="sm" />}
              </View>
              <View style={styles.ratingRow}>
                <Rating rating={targetUser.rating} size={11} showText />
              </View>
              <Text style={styles.profileSubtext}>{targetUser.subtext}</Text>
            </View>
          </View>
          <Text style={styles.serviceText}>
            <Text style={styles.boldText}>Detalles del servicio completado: </Text>
            {serviceDetails}
          </Text>
        </Card>

        {/* Card 2: Calificación y Reseña */}
        <Card style={styles.card} padded={true}>
          <Text style={styles.cardTitle}>Calificación y Reseña</Text>
          <Text style={styles.cardSubtitle}>
            ¿Cómo calificarías a {targetUser.name}?
          </Text>

          <View style={styles.ratingContainer}>
            <Rating
              rating={selectedRating}
              onRatingChange={setSelectedRating}
              size={36}
            />
          </View>

          <TextInput
            placeholder="Escribe tu reseña..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </Card>

        {/* Card 3: Detalles de Cobro */}
        <View style={styles.billingCard}>
          <View style={styles.billingRow}>
            <View style={styles.billingInfoLeft}>
              <Text style={styles.billingTitle}>Dirección de servicio</Text>
              <Text style={styles.billingVal} numberOfLines={1}>
                {address}
              </Text>
            </View>
            <Pressable>
              <Text style={styles.mapLink}>Ver en mapa &gt;</Text>
            </Pressable>
          </View>

          <View style={[styles.billingRow, styles.billingRowLast]}>
            <View>
              <View style={styles.totalLabelRow}>
                <Text style={styles.billingTitle}>Total del servicio</Text>
                <Icon name="Info" size={14} color={TOKENS.colors.textMuted} />
              </View>
              <Text style={styles.billingSub}>Pagado mediante {paymentMethod}</Text>
            </View>
            <View style={styles.totalInfoRight}>
              <Text style={styles.totalPrice}>
                ${amount.toLocaleString('es-CL')}
              </Text>
              <Text style={styles.paymentMethodText}>Método: {paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Pressable style={styles.supportBtn}>
            <Icon name="LifeBuoy" size={16} color={TOKENS.colors.brand500} />
            <Text style={styles.supportBtnText}>Necesito soporte</Text>
          </Pressable>

          <Button
            title="Enviar calificación y finalizar"
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface100,
  },

  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
    textAlign: 'center',
    marginVertical: TOKENS.spacing.md,
  },
  card: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.md,
  },
  cardTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: TOKENS.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  profileSubtext: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  serviceText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.sm,
  },
  ratingContainer: {
    alignSelf: 'center',
    marginVertical: TOKENS.spacing.md,
  },
  textarea: {
    width: '100%',
    height: 100,
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
    textAlignVertical: 'top',
    marginBottom: TOKENS.spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface300,
    backgroundColor: TOKENS.colors.surface50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand500,
  },
  checkboxLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
  },
  billingCard: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: TOKENS.spacing.lg,
    ...TOKENS.shadows.soft,
  },
  billingRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingRowLast: {
    borderBottomWidth: 0,
  },
  billingInfoLeft: {
    flex: 1,
  },
  billingTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: 'bold',
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  billingVal: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  mapLink: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: '600',
    color: TOKENS.colors.brand500,
    marginLeft: 8,
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billingSub: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
  },
  totalInfoRight: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: TOKENS.colors.brand500,
    letterSpacing: -0.5,
  },
  paymentMethodText: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.white,
  },
  supportBtnText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: 'bold',
    color: TOKENS.colors.brand500,
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
  },
});
