import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

interface HousePinProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

const HousePinComponent: React.FC<HousePinProps> = ({ coordinate }) => {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      tracksViewChanges={false}
      zIndex={900}
    >
      <View style={styles.container}>
        {/* Soft Ambient Halo */}
        <View style={styles.ambientHalo} />

        {/* High-Contrast Uber Destination Target */}
        <View style={styles.targetBadge}>
          <View style={styles.iconWrap}>
            <Icon name="Home" size={15} color={TOKENS.colors.white} />
          </View>
        </View>
      </View>
    </Marker>
  );
};

function areHousePinPropsEqual(prev: HousePinProps, next: HousePinProps): boolean {
  const latDiff = Math.abs(prev.coordinate.latitude - next.coordinate.latitude);
  const lngDiff = Math.abs(prev.coordinate.longitude - next.coordinate.longitude);
  return latDiff < 0.00001 && lngDiff < 0.00001;
}

export const HousePin = React.memo(HousePinComponent, areHousePinPropsEqual);

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientHalo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  targetBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 7,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
