import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

interface ProviderPinProps {
  provider: any;
  coordinate: { latitude: number; longitude: number };
  isSelected: boolean;
  onPress: () => void;
}

export const ProviderPin: React.FC<ProviderPinProps> = ({
  provider,
  coordinate,
  isSelected,
  onPress,
}) => {
  const markerRef = useRef<any>(null);

  return (
    <Marker
      ref={markerRef}
      coordinate={coordinate}
      tracksViewChanges={false}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={[styles.container, isSelected && styles.containerSelected]}>
        {provider.avatar ? (
          <Image
            source={{ uri: provider.avatar }}
            style={styles.avatar}
            onLoad={() => markerRef.current?.redraw()}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {provider.name ? provider.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
          <View style={styles.ratingRow}>
            <Icon name="Star" size={10} color="#FFB300" />
            <Text style={styles.ratingText}>{(provider.rating || 0).toFixed(1)}</Text>
          </View>
          <Text style={styles.price}>${(provider.pricePerHour || 0).toLocaleString('es-CL')}</Text>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 4,
    paddingRight: 10,
    alignItems: 'center',
    ...TOKENS.shadows.floating,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerSelected: {
    borderColor: TOKENS.colors.brand500,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: TOKENS.colors.brand600,
  },
  info: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  ratingText: {
    fontSize: 9,
    color: TOKENS.colors.textSubtle,
    marginLeft: 2,
    fontWeight: '600',
  },
  price: {
    fontSize: 11,
    fontWeight: '800',
    color: TOKENS.colors.textMain,
    marginTop: 1,
  },
});
