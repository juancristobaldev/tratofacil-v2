import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { UBICACIONES_CHILE, getCiudadesPorRegion } from '../../utils/chile';

export interface RegionCitySelectProps {
  region: string;
  city: string;
  onRegionChange: (region: string) => void;
  onCityChange: (city: string) => void;
  regionLabel?: string;
  cityLabel?: string;
  regionPlaceholder?: string;
  cityPlaceholder?: string;
  regionError?: string;
  cityError?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testIDPrefix?: string;
  regionHelperText?: string;
  cityHelperText?: string;
}

export const RegionCitySelect: React.FC<RegionCitySelectProps> = ({
  region,
  city,
  onRegionChange,
  onCityChange,
  regionLabel = 'Región *',
  cityLabel = 'Ciudad / Comuna *',
  regionPlaceholder = 'Selecciona una región',
  cityPlaceholder = 'Selecciona tu ciudad o comuna',
  regionError,
  cityError,
  disabled = false,
  containerStyle,
  testIDPrefix = 'region-city',
  regionHelperText,
  cityHelperText,
}) => {
  const [activePicker, setActivePicker] = useState<'region' | 'city' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const ciudadesDisponibles = useMemo(() => {
    return getCiudadesPorRegion(region);
  }, [region]);

  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const options = useMemo(() => {
    if (activePicker === 'region') {
      return UBICACIONES_CHILE.map((u) => u.region);
    }
    if (activePicker === 'city') {
      return ciudadesDisponibles;
    }
    return [];
  }, [activePicker, ciudadesDisponibles]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = normalizeText(searchQuery);
    return options.filter((opt) => normalizeText(opt).includes(q));
  }, [options, searchQuery]);

  const handleOpenPicker = (type: 'region' | 'city') => {
    if (disabled) return;
    if (type === 'city' && !region) return;
    setSearchQuery('');
    setActivePicker(type);
  };

  const handleSelectOption = (value: string) => {
    if (activePicker === 'region') {
      onRegionChange(value);
      const citiesInNewRegion = getCiudadesPorRegion(value);
      if (!citiesInNewRegion.includes(city)) {
        onCityChange('');
      }
    } else if (activePicker === 'city') {
      onCityChange(value);
    }
    setActivePicker(null);
    setSearchQuery('');
  };

  const isCityDisabled = disabled || !region;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 1. SELECT REGION */}
      <View style={styles.fieldGroup}>
        {!!regionLabel && <Text style={styles.label}>{regionLabel}</Text>}
        <TouchableOpacity
          testID={`${testIDPrefix}-region-trigger`}
          accessibilityRole="button"
          accessibilityLabel={`${regionLabel}: ${region || regionPlaceholder}`}
          style={[
            styles.selectField,
            disabled && styles.selectFieldDisabled,
            !!regionError && styles.selectFieldError,
          ]}
          onPress={() => handleOpenPicker('region')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectText,
              !region && styles.selectPlaceholder,
              disabled && styles.selectTextDisabled,
            ]}
            numberOfLines={1}
          >
            {region || regionPlaceholder}
          </Text>
          <Icon
            name="ChevronDown"
            size={18}
            color={disabled ? TOKENS.colors.textMuted : TOKENS.colors.textSubtle}
          />
        </TouchableOpacity>
        {!!regionError && <Text style={styles.errorText}>{regionError}</Text>}
        {!regionError && !!regionHelperText && (
          <Text style={styles.helperText}>{regionHelperText}</Text>
        )}
      </View>

      {/* 2. SELECT CIUDAD / COMUNA */}
      <View style={styles.fieldGroup}>
        {!!cityLabel && <Text style={styles.label}>{cityLabel}</Text>}
        <TouchableOpacity
          testID={`${testIDPrefix}-city-trigger`}
          accessibilityRole="button"
          accessibilityLabel={`${cityLabel}: ${city || (isCityDisabled ? 'Primero elige una región' : cityPlaceholder)}`}
          style={[
            styles.selectField,
            isCityDisabled && styles.selectFieldDisabled,
            !!cityError && styles.selectFieldError,
          ]}
          onPress={() => handleOpenPicker('city')}
          disabled={isCityDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectText,
              !city && styles.selectPlaceholder,
              isCityDisabled && styles.selectTextDisabled,
            ]}
            numberOfLines={1}
          >
            {city || (!region ? 'Primero elige una región' : cityPlaceholder)}
          </Text>
          <Icon
            name="ChevronDown"
            size={18}
            color={isCityDisabled ? TOKENS.colors.textMuted : TOKENS.colors.textSubtle}
          />
        </TouchableOpacity>
        {!!cityError && <Text style={styles.errorText}>{cityError}</Text>}
        {!cityError && !!cityHelperText && (
          <Text style={styles.helperText}>{cityHelperText}</Text>
        )}
      </View>

      {/* SEARCHABLE MODAL */}
      <Modal
        visible={activePicker !== null}
        onClose={() => {
          setActivePicker(null);
          setSearchQuery('');
        }}
        contentStyle={styles.modalContent}
      >
        <Text style={styles.modalTitle}>
          {activePicker === 'region' ? 'Seleccionar Región' : 'Seleccionar Ciudad / Comuna'}
        </Text>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Icon name="Search" size={18} color={TOKENS.colors.textSubtle} />
          <TextInput
            testID={`${testIDPrefix}-search-input`}
            style={styles.searchInput}
            placeholder={
              activePicker === 'region'
                ? 'Buscar región...'
                : 'Buscar comuna o ciudad...'
            }
            placeholderTextColor={TOKENS.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="X" size={16} color={TOKENS.colors.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* LIST */}
        <ScrollView
          style={styles.optionsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {filteredOptions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
            </View>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected =
                activePicker === 'region' ? region === opt : city === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  testID={`${testIDPrefix}-option-${opt}`}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelectOption(opt)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && (
                    <Icon
                      name="Check"
                      size={18}
                      color={TOKENS.colors.brand500}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: TOKENS.spacing.md,
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
    marginBottom: 6,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.md,
    minHeight: 52,
    ...TOKENS.shadows.soft,
  },
  selectFieldDisabled: {
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface100,
  },
  selectFieldError: {
    borderColor: TOKENS.colors.statusError,
  },
  selectText: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.medium,
    flex: 1,
    paddingRight: TOKENS.spacing.sm,
  },
  selectPlaceholder: {
    color: TOKENS.colors.textMuted,
  },
  selectTextDisabled: {
    color: TOKENS.colors.textMuted,
  },
  errorText: {
    color: TOKENS.colors.statusError,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.semibold,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    color: TOKENS.colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },

  modalContent: {
    maxWidth: 360,
    maxHeight: '80%',
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.md,
  },
  modalTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
    paddingRight: 28,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.sm,
    height: 42,
    marginBottom: TOKENS.spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    paddingVertical: 0,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  optionItemSelected: {
    backgroundColor: TOKENS.colors.brand50,
    borderRadius: 8,
  },
  optionText: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    flex: 1,
  },
  optionTextSelected: {
    color: TOKENS.colors.brand700,
    fontWeight: TOKENS.typography.weights.bold,
  },
  emptyContainer: {
    paddingVertical: TOKENS.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
});
