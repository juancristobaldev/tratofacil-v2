import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Badge, Button, Card } from '../../components';
import { MOCK_PROVIDERS } from '../../mocks/mockData';
import { usePanel } from '../../context/PanelContext';

export const ProviderProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { openPanel } = usePanel();
  const { providerId } = route.params || { providerId: 'p1' };
  const provider = useMemo(() => MOCK_PROVIDERS.find((p) => p.id === providerId) || MOCK_PROVIDERS[0], [providerId]);

  const handleBooking = () => {
    navigation.goBack();
    openPanel('focus_client', { providerId: provider.id });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Avatar uri={provider.avatar} name={provider.name} size={80} />
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.serviceName}>{provider.serviceName}</Text>
          <View style={styles.badgesRow}>
            {provider.verified && <Badge label="SEC Autorizado" tone="success" />}
            <Badge label="TOP PRO" tone="brand" />
          </View>
          <View style={styles.ratingRow}>
            <Rating rating={provider.rating} size={14} reviewsCount={provider.reviewsCount} showText />
          </View>
          <Text style={styles.price}>${provider.pricePerHour.toLocaleString('es-CL')} / hr</Text>
          <Button title="Solicitar Servicio" onPress={handleBooking} style={styles.bookBtn} />
        </View>

        <Card style={styles.descCard} padded={true}>
          <Text style={styles.sectionLabel}>Acerca de</Text>
          <Text style={styles.descText}>{provider.description}</Text>
        </Card>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md, paddingBottom: 40 },
  profileSection: { alignItems: 'center', backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusCard, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200, marginBottom: 4 },
  name: { fontSize: TOKENS.typography.sizes.xl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginTop: 12 },
  serviceName: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ratingRow: { marginTop: 8 },
  price: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.brand600, marginTop: 8 },
  bookBtn: { width: '100%', marginTop: TOKENS.spacing.md },
  descCard: { backgroundColor: TOKENS.colors.white },
  sectionLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  descText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18, marginTop: 6 },
  reviewCard: { backgroundColor: TOKENS.colors.white },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  reviewComment: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 16, fontStyle: 'italic' },
  reviewDate: { fontSize: 9, color: TOKENS.colors.textMuted, marginTop: 4 },
});
