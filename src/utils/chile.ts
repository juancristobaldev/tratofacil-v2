export const UBICACIONES_CHILE = [
  { region: "Arica y Parinacota", ciudades: ["Arica", "Putre", "Camarones"] },
  {
    region: "Tarapacá",
    ciudades: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica"],
  },
  {
    region: "Antofagasta",
    ciudades: ["Antofagasta", "Calama", "Taltal", "Mejillones"],
  },
  {
    region: "Atacama",
    ciudades: ["Copiapó", "Vallenar", "Chañaral", "Caldera"],
  },
  {
    region: "Coquimbo",
    ciudades: ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Vicuña"],
  },
  {
    region: "Valparaíso",
    ciudades: [
      "Valparaíso",
      "Viña del Mar",
      "Quilpué",
      "Villa Alemana",
      "Concón",
      "San Antonio",
    ],
  },
  {
    region: "Metropolitana de Santiago",
    ciudades: [
      "Santiago",
      "Conchalí",
      "Huechuraba",
      "Independencia",
      "Quilicura",
      "Recoleta",
      "Renca",
      "Las Condes",
      "Lo Barnechea",
      "Providencia",
      "Vitacura",
      "La Reina",
      "Macul",
      "Ñuñoa",
      "Peñalolén",
      "La Florida",
      "La Granja",
      "El Bosque",
      "La Cisterna",
      "La Pintana",
      "San Ramón",
      "Lo Espejo",
      "Pedro Aguirre Cerda",
      "San Joaquín",
      "San Miguel",
      "Cerrillos",
      "Estación Central",
      "Maipú",
      "Pudahuel",
      "Quinta Normal",
      "Cerro Navia",
      "Lo Prado",
      "San Bernardo",
      "Puente Alto",
      "Colina",
      "Lampa",
      "Tiltil",
      "Pirque",
      "San José de Maipo",
      "Buin",
      "Paine",
      "Calera de Tango",
      "Melipilla",
      "Alhué",
      "Curacaví",
      "María Pinto",
      "San Pedro",
      "Talagante",
      "El Monte",
      "Isla de Maipo",
      "Padre Hurtado",
      "Peñaflor",
    ],
  },
  {
    region: "O’Higgins",
    ciudades: ["Rancagua", "San Fernando", "Santa Cruz", "Machalí"],
  },
  { region: "Maule", ciudades: ["Talca", "Curicó", "Linares", "Molina"] },
  {
    region: "Ñuble",
    ciudades: ["Chillán", "Chillán Viejo", "Bulnes", "Coihueco"],
  },
  {
    region: "Biobío",
    ciudades: [
      "Concepción",
      "Talcahuano",
      "San Pedro de la Paz",
      "Chiguayante",
      "Los Ángeles",
    ],
  },
  {
    region: "Araucanía",
    ciudades: ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Lautaro"],
  },
  {
    region: "Los Ríos",
    ciudades: ["Valdivia", "La Unión", "Río Bueno", "Lanco"],
  },
  {
    region: "Los Lagos",
    ciudades: ["Puerto Montt", "Puerto Varas", "Osorno", "Ancud", "Castro"],
  },
  {
    region: "Aysén",
    ciudades: ["Coyhaique", "Puerto Aysén", "Chile Chico", "Cisnes"],
  },
  {
    region: "Magallanes",
    ciudades: ["Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams"],
  },
];

export const CHILEAN_BANKS: Record<string, string[]> = {
  "Banco Estado": [
    "Cuenta RUT",
    "Cuenta Corriente",
    "Cuenta Vista",
    "Cuenta Ahorro",
  ],
  "Banco de Chile": ["Cuenta Corriente", "Cuenta Vista", "Cuenta Ahorro"],
  "Banco Santander": ["Cuenta Corriente", "Cuenta Vista"],
  "Banco BCI": ["Cuenta Corriente", "Cuenta Vista"],
  "Banco Itaú": ["Cuenta Corriente"],
  "Scotiabank": ["Cuenta Corriente", "Cuenta Vista"],
  "Banco Falabella": ["Cuenta Corriente", "Cuenta Vista"],
  "Banco Security": ["Cuenta Corriente"],
  "Banco Bice": ["Cuenta Corriente"],
  "Banco Consorcio": ["Cuenta Corriente"],
  "Banco Internacional": ["Cuenta Corriente"],
  "HSBC Bank": ["Cuenta Corriente"],
  "Tenpo": ["Cuenta Vista"],
  "Mercado Pago": ["Cuenta Vista"],
};

export function containsPhoneNumber(text: string): boolean {
  if (!text) return false;

  const phoneRegex = /(\+?\d{1,3}[\s-]?)?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}/g;

  return phoneRegex.test(text);
}

export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;
  const cleanRut = rut.replace(/[^0-9kK-]/g, '');
  if (!/^[0-9]+-[0-9kK]{1}$/.test(cleanRut)) return false;
  
  const [num, dv] = cleanRut.split('-');
  let M = 0, S = 1, T = parseInt(num, 10);
  for (; T; T = Math.floor(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  return S ? (S - 1).toString() === dv : dv.toLowerCase() === 'k';
}
