import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
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
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [isFocused, pointCount, coordinate.latitude, coordinate.longitude]);

  // Dynamic size based on point count
  const size = Math.min(54, 38 + Math.min(pointCount, 15) * 1.2);
  const borderRadius = size / 2;

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
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
    borderWidth: 2.5,
    borderColor: TOKENS.colors.white,
    ...TOKENS.shadows.floating,
  },
  text: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.extrabold,
    fontSize: TOKENS.typography.sizes.sm,
  },
});
