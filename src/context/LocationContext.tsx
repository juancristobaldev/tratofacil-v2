import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, PermissionsAndroid, Linking, AppState, View, Text, StyleSheet, Alert } from 'react-native';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';
import { TOKENS } from '../theme';
import { Button, Icon } from '../components/ui';

interface LocationContextData {
  location: GeoPosition | null;
  permissionStatus: string;
  refreshLocation: () => void;
}

const LocationContext = createContext<LocationContextData>({} as LocationContextData);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const requestPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (hasPermission) {
          setPermissionStatus('granted');
          getLocation();
          return;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message: 'TratoFacil necesita acceder a tu ubicación para funcionar correctamente.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
          getLocation();
        } else {
          setPermissionStatus('denied');
        }
      } else {
        try {
          const status = await Geolocation.requestAuthorization('whenInUse');
          if (status === 'granted') {
            setPermissionStatus('granted');
            getLocation();
          } else {
            setPermissionStatus('denied');
          }
        } catch (error) {
          console.warn(error);
          setPermissionStatus('denied');
        }
      }
    } catch (err) {
      console.warn(err);
      setPermissionStatus('denied');
    }
  }, []);

  const getLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
      },
      (error) => {
        console.warn('Error getting location', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    requestPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        requestPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestPermission]);

  const value = useMemo(() => ({
    location,
    permissionStatus,
    refreshLocation: getLocation,
  }), [location, permissionStatus, getLocation]);

  if (permissionStatus === 'pending') {
    return (
      <LocationContext.Provider value={value}>
        <View style={styles.center}>
          <Text style={styles.text}>Cargando permisos...</Text>
        </View>
      </LocationContext.Provider>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <LocationContext.Provider value={value}>
        <View style={styles.blockerContainer}>
          <View style={styles.iconCircle}>
            <Icon name="MapPinOff" size={48} color={TOKENS.colors.white} />
          </View>
          <Text style={styles.blockerTitle}>Ubicación Requerida</Text>
          <Text style={styles.blockerSubtitle}>
            TratoFácil necesita acceso a tu ubicación de forma obligatoria para conectar clientes con profesionales cercanos y poder mostrarte en el mapa.
          </Text>
          <Button 
            title="Abrir Configuración" 
            onPress={() => {
              Linking.openSettings().catch(() => {
                Alert.alert(
                  'Atención', 
                  'No se pudo abrir la configuración del sistema automáticamente. Por favor ve a Ajustes > Aplicaciones > TratoFacil para dar permisos manualmente.'
                );
              });
            }} 
            style={styles.blockerBtn} 
          />
        </View>
      </LocationContext.Provider>
    );
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
  text: { color: TOKENS.colors.textSubtle, fontSize: TOKENS.typography.sizes.sm },
  blockerContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xl,
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blockerTitle: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
    textAlign: 'center',
  },
  blockerSubtitle: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: TOKENS.spacing.xxl,
  },
  blockerBtn: {
    width: '100%',
  },
});
