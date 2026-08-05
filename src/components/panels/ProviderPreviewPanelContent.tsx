import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TOKENS } from '../../theme';
import { Avatar, Button, Rating } from '../ui';
import { usePanel } from '../../context/PanelContext';

export const ProviderPreviewPanelContent: React.FC = () => {
  const { panelData } = usePanel();
  const provider = panelData?.provider;
  const onViewProfile = panelData?.onViewProfile;

  if (!provider) return null;

  const handleViewProfile = () => {
    if (typeof onViewProfile === 'function') {
      onViewProfile(provider);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.providerRow}>
        <Avatar uri={provider.avatar} name={provider.name || provider.providerName || ''} size={56} />
        <View style={styles.providerInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {provider.name || provider.providerName}
          </Text>
          <Rating
            rating={provider.rating || 0}
            size={13}
            showText
            textSuffix="reseñas"
            reviewsCount={provider.reviewsCount}
          />
          {provider.serviceName ? (
            <Text style={styles.service} numberOfLines={1}>
              {provider.serviceName}
            </Text>
          ) : null}
        </View>
      </View>

      <Button
        title="Ver Profesional"
        icon="User"
        onPress={handleViewProfile}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  providerInfo: {
    flex: 1,
    marginLeft: TOKENS.spacing.md,
  },
  name: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  service: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  button: {
    width: '100%',
  },
});
