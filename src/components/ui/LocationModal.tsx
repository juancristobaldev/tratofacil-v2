import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { TOKENS } from '../../theme';
import { useLocation } from '../../context/LocationContext';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
}) => {
  const { location } = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSelect = (loc: string) => {
    onSelectLocation(loc);
    onClose();
  };

  const handleUseCurrentLocation = async () => {
    if (!location) {
      handleSelect('Mi ubicación actual');
      return;
    }

    setIsLoading(true);
    try {
      const { latitude, longitude } = location.coords;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`, {
        headers: {
          'User-Agent': 'TratoFacilApp/1.0', // Nominatim requires User-Agent
          'Accept-Language': 'es'
        }
      });
      const data = await response.json();
      
      let addressName = 'Mi ubicación actual';
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county;
        const state = data.address.state || data.address.region;
        if (city && state) {
          addressName = `${city}, ${state}`;
        } else if (city) {
          addressName = city;
        } else if (data.display_name) {
          // fallback to a short version of display name
          addressName = data.display_name.split(',').slice(0, 2).join(', ');
        }
      }
      
      handleSelect(addressName);
    } catch (error) {
      console.warn('Geocoding error', error);
      handleSelect('Mi ubicación actual'); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={true}>
      <Text style={styles.modalTitle}>Cambiar Ubicación</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.modalOption} 
          onPress={handleUseCurrentLocation}
          disabled={isLoading}
        >
          <Text style={[styles.modalOptionText, isLoading && styles.loadingText]}>
            {isLoading ? 'Obteniendo dirección...' : 'Usar mi ubicación actual'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalOption} onPress={() => handleSelect('Santiago Centro, RM')}>
          <Text style={styles.modalOptionText}>Santiago Centro, RM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalOption} onPress={() => handleSelect('Las Condes, RM')}>
          <Text style={styles.modalOptionText}>Las Condes, RM</Text>
        </TouchableOpacity>
      </View>
      <Button title="Cancelar" variant="secondary" onPress={onClose} style={styles.cancelBtn} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  optionsContainer: {
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.lg,
  },
  modalOption: {
    paddingVertical: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  modalOptionText: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.semibold,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: TOKENS.spacing.xs,
  },
  loadingText: {
    color: TOKENS.colors.textSubtle,
  },
});
