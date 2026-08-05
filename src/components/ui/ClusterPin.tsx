import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { TOKENS } from '../../theme';

interface ClusterPinProps {
  coordinate: { latitude: number; longitude: number };
  pointCount: number;
  onPress: () => void;
}

export const ClusterPin: React.FC<ClusterPinProps> = ({
  coordinate,
  pointCount,
  onPress,
}) => {
  // Dynamic size based on point count
  const size = Math.min(60, 36 + (pointCount * 1.5));
  const borderRadius = size / 2;

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={false}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={[styles.container, { width: size, height: size, borderRadius }]}>
        <Text style={styles.text}>{pointCount}</Text>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: TOKENS.colors.white,
    ...TOKENS.shadows.floating,
  },
  text: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.extrabold,
    fontSize: TOKENS.typography.sizes.md,
  },
});
