export const DARK_VISIBLE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1b1b1f' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1f' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#c0c0c0' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },

  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#222228' }] },

  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e1e24' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1f' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#383838' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a8a8a8' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1f' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#464646' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#b5b5b5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#525252' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#36363a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c8c8c8' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#5a5a5a' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#2e2e32' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },

  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#333336' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a5a' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e14' }] },
];
