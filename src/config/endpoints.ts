import { Platform } from 'react-native';
import Config from 'react-native-config';

const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const ENDPOINT_API = Config.API_URL ?? `http://${DEFAULT_HOST}:4000/`;
const API_BASE = Config.API_URL?.replace(/\/$/, '') ?? `http://${DEFAULT_HOST}:4000`;
const MEDIA_BASE = Config.MEDIA_CDN ?? `http://${DEFAULT_HOST}:3002`;
const FRONTEND_BASE = Config.FRONTEND_URL ?? `http://${DEFAULT_HOST}:3000`;

export const ENDPOINT = ENDPOINT_API;
export const GRAPHQL_ENDPOINT = `${ENDPOINT_API}graphql`;
export const API_BASE_URL = API_BASE;
export const MEDIA_ENDPOINT = `${MEDIA_BASE}/`;
export const WEB_CALLBACK_URL = `${FRONTEND_BASE}/api/callback`;

// Distancia maxima (km) para habilitar el inicio de la orden en tiempo real.
// Debe coincidir con REALTIME_START_MAX_DISTANCE_KM del backend (0.3).
// Valor hardcodeado a proposito (no viene de env).
export const START_ORDER_DISTANCE_KM = 0.3;
