import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import { TOKENS } from '../../theme';

interface ClusterPinProps {
  coordinate: { latitude: number; longitude: number };
  pointCount: number;
  onPress: () => void;
  isMapManipulating?: boolean;
}

const ClusterPinComponent: React.FC<ClusterPinProps> = ({
  coordinate,
  pointCount,
  onPress,
  isMapManipulating = false,
}) => {
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const initialWarmupDoneRef = useRef(false);

  useEffect(() => {
    if (isMapManipulating) {
      setTracksViewChanges(false);
      return;
    }

    if (!initialWarmupDoneRef.current && isFocused) {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        initialWarmupDoneRef.current = true;
        setTracksViewChanges(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isFocused, isMapManipulating, pointCount]);

  // Dynamic size based on point count
  const size = Math.min(54, 38 + Math.min(pointCount, 15) * 1.2);
  const borderRadius = size / 2;
  const effectiveTracksViewChanges = !isMapManipulating && tracksViewChanges;

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={effectiveTracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={styles.wrapper}>
        {/* Soft Ambient Halo */}
        <View
          style={[
            styles.halo,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: (size + 10) / 2,
            },
          ]}
        />
        {/* Crisp Solid Core */}
        <View style={[styles.container, { width: size, height: size, borderRadius }]}>
          <Text style={styles.text}>{pointCount}</Text>
        </View>
      </View>
    </Marker>
  );
};

function areClusterPropsEqual(prev: ClusterPinProps, next: ClusterPinProps): boolean {
  if (prev.isMapManipulating !== next.isMapManipulating) return false;
  if (prev.pointCount !== next.pointCount) return false;
  if ((prev.onPress == null) !== (next.onPress == null)) return false;

  const latDiff = Math.abs(prev.coordinate.latitude - next.coordinate.latitude);
  const lngDiff = Math.abs(prev.coordinate.longitude - next.coordinate.longitude);
  return latDiff < 0.00001 && lngDiff < 0.00001;
}

export const ClusterPin = React.memo(ClusterPinComponent, areClusterPropsEqual);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(230, 0, 126, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 126, 0.35)',
  },
  container: {
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: TOKENS.colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 7,
  },
  text: {
    color: TOKENS.colors.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: -0.2,
  },
});
