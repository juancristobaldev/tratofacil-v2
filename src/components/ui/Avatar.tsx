import React from 'react';
import { StyleSheet, Text, View, Image, ViewStyle } from 'react-native';
import { TOKENS } from '../../theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 48, style }) => {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textStyle = {
    fontSize: size * 0.4,
    color: TOKENS.colors.brand600,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <Text style={[styles.initials, textStyle]}>{initials}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: TOKENS.typography.weights.extrabold,
  },
});
