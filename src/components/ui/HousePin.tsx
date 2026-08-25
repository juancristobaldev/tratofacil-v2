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

export const HousePin: React.FC<HousePinProps> = ({ coordinate }) => {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.container}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Icon name="Home" size={16} color={TOKENS.colors.white} />
          </View>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 40,
    height: 40,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.floating,
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: TOKENS.colors.brand500,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
