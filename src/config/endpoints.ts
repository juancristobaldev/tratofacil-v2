import { Platform } from 'react-native';
import Config from 'react-native-config';

const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

if (__DEV__) console.log('[endpoints] Config.API_URL =', Config.API_URL);

const ENDPOINT_API = Config.API_URL ?? `http://${DEFAULT_HOST}:4000/`;
const API_BASE = Config.API_URL?.replace(/\/$/, '') ?? `http://${DEFAULT_HOST}:4000`;
const MEDIA_BASE = (Config.MEDIA_CDN?.replace(/\/$/, '') ?? `http://${DEFAULT_HOST}:3002`);
const FRONTEND_BASE = (Config.FRONTEND_URL?.replace(/\/$/, '') ?? `http://${DEFAULT_HOST}:3000`);

export const ENDPOINT = ENDPOINT_API;
export const GRAPHQL_ENDPOINT = `${ENDPOINT_API}graphql`;
export const API_BASE_URL = API_BASE;
export const MEDIA_ENDPOINT = `${MEDIA_BASE}/`;
export const WEB_CALLBACK_URL = `${FRONTEND_BASE}/api/callback`;
export const REGISTER_CARD_CALLBACK_URL = `${FRONTEND_BASE}/api/register-card`;
export const DEEP_LINK_CALLBACK = 'tratofacilv2://payment/callback';
export const CARD_DEEP_LINK_CALLBACK = `${DEEP_LINK_CALLBACK}?type=card`;

// Distancia maxima (km) para habilitar el inicio de la orden en tiempo real (20 metros = 0.02 km).
export const START_ORDER_DISTANCE_KM = 0.02;

// Servidor de rutas (OSRM). Apuntar a una instancia propia en producción;
// el servidor público gratuito es solo para desarrollo (rate-limit e inestable).
export const OSRM_BASE_URL =
  Config.OSRM_URL ?? 'https://router.project-osrm.org/route/v1/driving';

// Proxy de rutas por backend (Google Maps Directions API server-side).
export const DIRECTIONS_ENDPOINT = `${API_BASE}/api/directions`;
