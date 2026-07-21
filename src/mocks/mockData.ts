export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  subcategories: string[];
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Provider {
  id: string;
  name: string;
  providerName: string;
  avatar: string;
  rating: number;
  reviewsCount: number;
  verified: boolean;
  description: string;
  pricePerHour: number;
  city: string;
  serviceName: string;
  categorySlug: string;
  phone: string;
  link: string;
  reviews: Review[];
}

export interface MockOrder {
  id: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  status: 'PENDING' | 'ACCEPTED' | 'PAID' | 'EN_CAMINO' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';
  price: number;
  date: string;
  clientName: string;
  clientAddress: string;
}

export const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Construcción',
    slug: 'construccion',
    icon: 'Home',
    subcategories: ['Remodelaciones', 'Pintura', 'Albañilería', 'Techumbre'],
  },
  {
    id: '2',
    name: 'Electricidad',
    slug: 'electricidad',
    icon: 'Zap',
    subcategories: ['Instalaciones', 'Cortocircuitos', 'Tableros eléctricos', 'Iluminación'],
  },
  {
    id: '3',
    name: 'Gasfitería',
    slug: 'gasfiteria',
    icon: 'Droplet',
    subcategories: ['Destapes', 'Filtraciones', 'Instalación de Calefont', 'Grifería'],
  },
  {
    id: '4',
    name: 'Aseo y Limpieza',
    slug: 'aseo',
    icon: 'Sparkles',
    subcategories: ['Limpieza de alfombras', 'Aseo de casas', 'Limpieza post-obra', 'Vidrios'],
  },
  {
    id: '5',
    name: 'Fletes y Mudanzas',
    slug: 'fletes',
    icon: 'Truck',
    subcategories: ['Fletes locales', 'Mudanza completa', 'Embalaje', 'Reparto'],
  },
  {
    id: '6',
    name: 'Mecánica',
    slug: 'mecanica',
    icon: 'Wrench',
    subcategories: ['Afinamiento', 'Frenos', 'Cambio de aceite', 'Scanner automotriz'],
  },
  {
    id: '7',
    name: 'Servicios Informáticos',
    slug: 'informatica',
    icon: 'Monitor',
    subcategories: ['Soporte PC', 'Instalación de software', 'Redes y Wifi', 'Formateo'],
  },
  {
    id: '8',
    name: 'Jardinería',
    slug: 'jardineria',
    icon: 'Leaf',
    subcategories: ['Corte de césped', 'Poda de árboles', 'Riego automático', 'Diseño de jardín'],
  },
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    userName: 'Carlos Valdés',
    rating: 5,
    comment: 'Excelente servicio. Llegó a la hora acordada y solucionó el problema eléctrico rápidamente. Muy recomendado.',
    date: '10 Jul 2026',
  },
  {
    id: 'r2',
    userName: 'María Inés',
    rating: 4.8,
    comment: 'Muy profesional. Explicó detalladamente cuál era la falla y dejó todo impecable.',
    date: '05 Jul 2026',
  },
  {
    id: 'r3',
    userName: 'Andrés Soto',
    rating: 4.5,
    comment: 'Buen trabajo y excelente disposición para responder mis dudas. El precio fue justo.',
    date: '28 Jun 2026',
  },
];

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Carlos Gutiérrez',
    providerName: 'Carlos Gutiérrez Electricidad',
    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=150&auto=format&fit=crop',
    rating: 4.9,
    reviewsCount: 38,
    verified: true,
    description: 'Electricista autorizado por la SEC. Más de 10 años de experiencia en instalaciones domiciliarias, tableros eléctricos, detección de fugas y cortocircuitos. Trabajo rápido, garantizado y bajo las normativas de seguridad chilenas.',
    pricePerHour: 22000,
    city: 'Santiago',
    serviceName: 'Especialista en Tableros e Iluminación',
    categorySlug: 'electricidad',
    phone: '+56987654321',
    link: 'carlos-gutierrez-sec.cl',
    reviews: MOCK_REVIEWS,
  },
  {
    id: 'p2',
    name: 'Roberto Muñoz',
    providerName: 'Servicios de Gasfitería RM',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop',
    rating: 4.8,
    reviewsCount: 29,
    verified: true,
    description: 'Especialista en destapes de cañerías, reparación de filtraciones de agua y gas, mantención de calefont e instalaciones sanitarias de grifería y sanitarios en general. Atención de urgencias 24/7.',
    pricePerHour: 25000,
    city: 'Santiago',
    serviceName: 'Destapes y Reparaciones Sanitarias',
    categorySlug: 'gasfiteria',
    phone: '+56976543210',
    link: 'gasfiteriarm.cl',
    reviews: [
      {
        id: 'r4',
        userName: 'Fernanda Ríos',
        rating: 5,
        comment: 'Solucionó una filtración que otros no pudieron encontrar. Cobró lo justo y fue muy educado.',
        date: '14 Jul 2026',
      },
      ...MOCK_REVIEWS.slice(1),
    ],
  },
  {
    id: 'p3',
    name: 'Patricia Espinoza',
    providerName: 'Construcciones JP & Pintura',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop',
    rating: 4.7,
    reviewsCount: 15,
    verified: false,
    description: 'Ofrecemos servicios de albañilería, tabiquería de yeso-cartón, pintura interior y exterior de casas y departamentos. Rapidez, seriedad y excelentes terminaciones garantizadas.',
    pricePerHour: 18000,
    city: 'Santiago',
    serviceName: 'Remodelaciones y Pintura Express',
    categorySlug: 'construccion',
    phone: '+56965432109',
    link: 'construccionesjp.cl',
    reviews: MOCK_REVIEWS,
  },
  {
    id: 'p4',
    name: 'Jorge Henríquez',
    providerName: 'Fletes Jorge Express',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?q=80&w=150&auto=format&fit=crop',
    rating: 5.0,
    reviewsCount: 52,
    verified: true,
    description: 'Servicio de fletes rápidos y mudanzas medianas dentro y fuera de la Región Metropolitana. Contamos con camión cerrado de 3/4, mantas de embalaje y ayudantes experimentados para la carga.',
    pricePerHour: 30000,
    city: 'Santiago',
    serviceName: 'Fletes y Mudanzas de Confianza',
    categorySlug: 'fletes',
    phone: '+56954321098',
    link: 'fletesjorge.cl',
    reviews: MOCK_REVIEWS,
  },
];

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'ord101',
    providerId: 'p1',
    providerName: 'Carlos Gutiérrez',
    serviceName: 'Reparación de Tablero Eléctrico',
    status: 'COMPLETED',
    price: 22000,
    date: '12 Jul 2026',
    clientName: 'Juan Pérez',
    clientAddress: 'Av. Providencia 1450, Depto 402, Providencia',
  },
  {
    id: 'ord102',
    providerId: 'p2',
    providerName: 'Roberto Muñoz',
    serviceName: 'Destape de Cocina Urgente',
    status: 'IN_PROGRESS',
    price: 25000,
    date: '15 Jul 2026',
    clientName: 'Juan Pérez',
    clientAddress: 'Av. Providencia 1450, Depto 402, Providencia',
  },
];

export const MOCK_CHAT_HISTORY = [
  { id: '1', sender: 'client', text: 'Hola! Necesito reparar un enchufe de cocina que sufrió un cortocircuito.', time: '10:00' },
  { id: '2', sender: 'provider', text: 'Hola! Claro, con gusto. Para cambiar el enchufe dañado y revisar que no haya cables quemados en la canaleta, el valor sería de $22.000, incluyendo materiales básicos.', time: '10:02' },
  { id: '3', sender: 'client', text: 'Perfecto, me parece un precio excelente. ¿Cuándo podría venir?', time: '10:04' },
  { id: '4', sender: 'provider', text: 'Tengo disponibilidad inmediata. Ya le envié la cotización formal por la app para que pueda aceptarla y realizar el pago.', time: '10:05' },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Cotización recibida', message: 'Carlos Gutiérrez ha enviado una cotización por $22.000.', time: 'Hace 5 min', unread: true },
  { id: 'n2', title: 'Pago confirmado', message: 'Tu pago por la orden ord101 ha sido procesado exitosamente.', time: 'Ayer', unread: false },
  { id: 'n3', title: 'Servicio finalizado', message: 'Califica el servicio de Roberto Muñoz y cuéntanos tu experiencia.', time: 'Hace 3 días', unread: false },
];

export const MOCK_FAVORITES = ['p1', 'p4'];

export const MOCK_WALLET = {
  balance: 145000,
  transactions: [
    { id: 't1', title: 'Reparación de Enchufe Cocina', type: 'INCOME', amount: 22000, date: '12 Jul 2026' },
    { id: 't2', title: 'Mantención Calefont SEC', type: 'INCOME', amount: 45000, date: '11 Jul 2026' },
    { id: 't3', title: 'Retiro a Cuenta Vista Banco Estado', type: 'WITHDRAW', amount: -60000, date: '08 Jul 2026' },
    { id: 't4', title: 'Flete Express Providencia', type: 'INCOME', amount: 30000, date: '07 Jul 2026' },
  ],
};
