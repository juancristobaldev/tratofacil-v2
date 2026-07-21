import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Avatar } from '../../components';

export const ReviewsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const reviews = [
    { id: 1, name: 'María González', rating: 5, date: 'Hace 2 días', text: 'Excelente trabajo, muy puntual y profesional. Totalmente recomendado.' },
    { id: 2, name: 'Pedro Suárez', rating: 4, date: 'Hace 1 semana', text: 'Buen servicio, aunque se demoró un poco en llegar. El trabajo quedó impecable.' },
    { id: 3, name: 'Camila Rojas', rating: 5, date: 'Hace 2 semanas', text: 'Muy amable y transparente con los precios. Me explicó todo lo que estaba haciendo.' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 20 }]}>
        
        <View style={styles.headerBox}>
          <Text style={styles.ratingNumber}>4.8</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Icon key={i} name="Star" size={24} color={i <= 4 ? TOKENS.colors.starActive : TOKENS.colors.surface200} />
            ))}
          </View>
          <Text style={styles.reviewCount}>Basado en 14 reseñas</Text>
        </View>

        <View style={styles.list}>
          {reviews.map(rev => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.revHeader}>
                <View style={styles.revUserRow}>
                  <Avatar uri={null} name={rev.name} size={40} />
                  <View>
                    <Text style={styles.revName}>{rev.name}</Text>
                    <Text style={styles.revDate}>{rev.date}</Text>
                  </View>
                </View>
                <View style={styles.revRatingBadge}>
                  <Icon name="Star" size={14} color={TOKENS.colors.starActive} />
                  <Text style={styles.revRatingText}>{rev.rating}</Text>
                </View>
              </View>
              <Text style={styles.revText}>{rev.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  scrollBody: {
    padding: TOKENS.spacing.lg,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xl,
    paddingVertical: TOKENS.spacing.md,
  },
  ratingNumber: {
    fontSize: 56,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  list: {
    gap: TOKENS.spacing.md,
  },
  reviewCard: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: TOKENS.spacing.md,
  },
  revUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },
  revName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  revDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  revRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  revRatingText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  revText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
  },
});
