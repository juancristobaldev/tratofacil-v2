export type ModerationAction = 'ALLOW' | 'WARN' | 'MASK' | 'BLOCK' | 'REVIEW';

export type ModerationCategory =
  | 'CONTACT'
  | 'PERSONAL_DATA'
  | 'FINANCIAL_DATA'
  | 'CREDENTIAL'
  | 'EXTERNAL_URL'
  | 'SOCIAL_MEDIA'
  | 'OFF_PLATFORM'
  | 'LOCATION'
  | 'SPAM'
  | 'OBFUSCATION'
  | 'ABUSE'
  | 'UNKNOWN';

export type ModerationIntent =
  | 'GENERAL_CONVERSATION'
  | 'SERVICE_COORDINATION'
  | 'SCHEDULING'
  | 'LOCATION_COORDINATION'
  | 'PRICE_NEGOTIATION'
  | 'CONTACT_EXCHANGE'
  | 'OFF_PLATFORM_MIGRATION'
  | 'EXTERNAL_PAYMENT'
  | 'PERSONAL_DATA_SHARING'
  | 'FINANCIAL_DATA_SHARING'
  | 'CREDENTIAL_SHARING'
  | 'SPAM'
  | 'ABUSE'
  | 'UNKNOWN';

export type ModerationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ModerationFinding {
  category: ModerationCategory;
  entity: string;
  matchedText?: string;
  confidence: number;
  severity: ModerationSeverity;
  description?: string;
}

export interface ChatModerationContext {
  orderRealtimeId?: number;
  userId?: number;
  role?: 'client' | 'provider';
  orderStatus?: string;
  serviceCategory?: string;
}

export interface ChatModerationResult {
  valid: boolean;
  reason?: string;
  action: ModerationAction;
  riskScore: number;
  confidence: number;
  severity: ModerationSeverity;
  categories: ModerationCategory[];
  intents: ModerationIntent[];
  findings: ModerationFinding[];
}

const SPANISH_NUMBER_WORDS: Record<string, string> = {
  cero: '0', cer0: '0', uno: '1', un0: '1', una: '1', un: '1',
  dos: '2', d0s: '2', tres: '3', tr3s: '3', cuatro: '4', cu4tr0: '4',
  cinco: '5', c1nc0: '5', seis: '6', s31s: '6', siete: '7', s13t3: '7', sie7e: '7',
  ocho: '8', '0ch0': '8', nueve: '9', nu3v3: '9', nuev: '9',
  diez: '10', d13z: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15',
  dieciseis: '16', diecisiete: '17', dieciocho: '18', diecinueve: '19',
  veinte: '20', veintiuno: '21', veintidos: '22', veintitres: '23', veinticuatro: '24',
  veinticinco: '25', veintiseis: '26', veintisiete: '27', veintiocho: '28', veintinueve: '29',
  treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60', setenta: '70', ochenta: '80', noventa: '90',
  cien: '100', ciento: '100', quinientos: '500', mil: '1000',
};

function normalizeUnicodeAndDiacritics(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeLeetspeak(text: string): string {
  if (!text) return '';
  return text
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[+7]/g, 't')
    .replace(/8/g, 'b')
    .replace(/2/g, 'z');
}

function stripInterCharacterPunctuation(text: string): string {
  if (!text) return '';
  return text.replace(/[\s.\-_/*+#!?,;:()~^]+/g, '');
}

function extractAggregatedDigits(normalizedText: string): string {
  const tokens = normalizedText.split(/[\s,.;:\-_/()+]+/).filter(Boolean);
  let aggregated = '';
  for (const token of tokens) {
    const cleanToken = token.replace(/[^a-z0-9]/gi, '');
    if (!cleanToken) continue;
    if (/^\d+$/.test(cleanToken)) {
      aggregated += cleanToken;
    } else if (SPANISH_NUMBER_WORDS[cleanToken]) {
      aggregated += SPANISH_NUMBER_WORDS[cleanToken];
    } else {
      const subTokens = cleanToken.match(/\d+|[a-z]+/gi) || [];
      for (const sub of subTokens) {
        if (/^\d+$/.test(sub)) {
          aggregated += sub;
        } else if (SPANISH_NUMBER_WORDS[sub]) {
          aggregated += SPANISH_NUMBER_WORDS[sub];
        }
      }
    }
  }
  return aggregated;
}

export function evaluateChatMessage(
  rawText: string,
  context?: ChatModerationContext
): ChatModerationResult {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      valid: false,
      reason: 'El mensaje no puede estar vacío.',
      action: 'BLOCK',
      riskScore: 100,
      confidence: 1.0,
      severity: 'LOW',
      categories: ['UNKNOWN'],
      intents: ['UNKNOWN'],
      findings: [],
    };
  }

  const text = rawText.trim();
  if (text.length > 500) {
    return {
      valid: false,
      reason: 'El mensaje no puede superar los 500 caracteres.',
      action: 'BLOCK',
      riskScore: 90,
      confidence: 1.0,
      severity: 'MEDIUM',
      categories: ['SPAM'],
      intents: ['SPAM'],
      findings: [],
    };
  }

  const cleanLower = normalizeUnicodeAndDiacritics(text);
  const leetDecoded = normalizeLeetspeak(cleanLower);
  const compactLeet = stripInterCharacterPunctuation(leetDecoded);

  const findings: ModerationFinding[] = [];

  // 1. Credenciales y Contraseñas
  const cvvPattern = /\b(?:cvv|cvc|codigo\s+de\s+seguridad)\s*[:=]?\s*(\d{3,4})\b/i;
  const passPattern = /\b(?:mi\s+)?(?:password|contrasena|clave)\s*[:=]\s*(\S+)\b/i;
  const otpPattern = /\b(?:codigo\s+(?:de\s+verificacion|sms|otp))\s*[:=]?\s*(\d{4,8})\b/i;
  if (cvvPattern.test(cleanLower) || cvvPattern.test(leetDecoded)) {
    findings.push({ category: 'CREDENTIAL', entity: 'cvv', confidence: 0.98, severity: 'CRITICAL' });
  }
  if (passPattern.test(cleanLower) || passPattern.test(leetDecoded)) {
    findings.push({ category: 'CREDENTIAL', entity: 'password', confidence: 0.95, severity: 'CRITICAL' });
  }
  if (otpPattern.test(cleanLower) || otpPattern.test(leetDecoded)) {
    findings.push({ category: 'CREDENTIAL', entity: 'otp', confidence: 0.98, severity: 'CRITICAL' });
  }

  // 2. Correos
  const standardEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
  const obfEmailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*|\s*\[arroba\]\s*|\s*\(arroba\)\s*|\s+arroba\s+)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[punto\]\s*|\s*\(punto\)\s*|\s+punto\s+|\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+)[a-zA-Z]{2,}/i;
  if (standardEmailRegex.test(text) || standardEmailRegex.test(cleanLower) || obfEmailRegex.test(cleanLower)) {
    findings.push({ category: 'CONTACT', entity: 'email', confidence: 0.96, severity: 'HIGH' });
  }

  // 3. URLs y Enlaces
  const protocolUrlRegex = /(https?:\/\/|ftp:\/\/|www\.)[^\s]+/i;
  const domainRegex = /\b[a-zA-Z0-9-]{2,}\.(com|cl|net|org|io|me|co|app|xyz|dev|online|site|link|info|top|vip|cc|to|gg|ly|biz|tech)\b/i;
  const shortenerRegex = /\b(bit\.ly|tinyurl\.com|t\.co|wa\.me|cutt\.ly|linktr\.ee)[^\s]*/i;
  if (protocolUrlRegex.test(text) || domainRegex.test(cleanLower) || shortenerRegex.test(cleanLower)) {
    findings.push({ category: 'EXTERNAL_URL', entity: 'url', confidence: 0.95, severity: 'HIGH' });
  }

  // 4. Datos Financieros y RUT
  const rutRegex = /\b(?:\d{1,2}\.\d{3}\.\d{3}[- ][0-9kK]|\d{7,8}-[0-9kK]|(?:rut|r\.u\.t)[:\s]*\d{7,8}[- ]?[0-9kK]?)\b/i;
  if (rutRegex.test(cleanLower)) {
    findings.push({ category: 'FINANCIAL_DATA', entity: 'chilean_rut', confidence: 0.95, severity: 'HIGH' });
  }

  const financialKwRegex = /\b(cuenta\s*rut|cta\s*rut|ctarut|cuenta\s*corriente|cta\s*cte|cuenta\s*vista|chequera\s*electronica|cu3nt4\s*rut|ct4\s*rut|cu3nt4|banco\s*estado|santander|banco\s*de\s*chile|bci|scotiabank|itau|falabella|ripley|security|bice|tenpo|mach|coopeuch|mercadopago|mercado\s*pago|b4nc0|s4nt4nd3r|m3rc4d0p4g0|transferencia|transferir|transfiero|transfer|tr4nsf3r|tr4nsf3r3nc14|deposito|depositar|te\s*deposito|datos\s*de\s*transferencia|datos\s*bancarios|datos\s*para\s*transferir|pago\s*por\s*fuera|pagar\s*por\s*fuera|pago\s*en\s*mano|pagar\s*en\s*mano|pago\s*directo|trato\s*directo|por\s*fuera|por\s*interno|cbu|cvu|alias\s+cbu)\b/i;
  if (financialKwRegex.test(cleanLower) || financialKwRegex.test(leetDecoded) || financialKwRegex.test(compactLeet)) {
    findings.push({ category: 'FINANCIAL_DATA', entity: 'financial_terms', confidence: 0.94, severity: 'HIGH' });
  }

  // 5. Teléfonos
  const chileanPhonePattern = /(?:(?:\+?56\s*9|9)\s*(?:\d[\s.\-_/()]*){7,8}|(?:\+?56\s*2|2)\s*(?:\d[\s.\-_/()]*){6,8})/;
  const aggregatedDigits = extractAggregatedDigits(cleanLower);
  const numberWordsCount = (cleanLower.match(/\b(cero|cer0|uno|un0|dos|d0s|tres|tr3s|cuatro|cu4tr0|cinco|c1nc0|seis|siete|s13t3|sie7e|ocho|0ch0|nueve|nu3v3)\b/gi) || []).length;
  if (chileanPhonePattern.test(text) || chileanPhonePattern.test(cleanLower) || aggregatedDigits.length >= 8 || numberWordsCount >= 4) {
    findings.push({ category: 'CONTACT', entity: 'phone', confidence: 0.95, severity: 'HIGH' });
  }

  // 6. Redes Sociales
  const socialPatterns = [
    /\b(whats?app|wsp|wsap|wasap|wapp|telegram|t\.me|instagram|insta|ig|tiktok|facebook|fb|discord|skype|zoom|facetime|signal|wechat|snapchat)\b/i,
    /\b(wh4ts4pp|w5p|1nst4|1nst4gr4m|1g)\b/i,
    /(?:wsp|whatsapp|insta|telegram|discord)/i,
    /@\s*[a-zA-Z0-9_]{3,}/,
    /\b(escribeme\s+al|llamame\s+al|mi\s+celu?\b|mi\s+fono\b|mi\s+contacto\b|hablar\s+por\s+fuera)\b/i,
  ];
  for (const p of socialPatterns) {
    if (p.test(text) || p.test(cleanLower) || p.test(leetDecoded) || p.test(compactLeet)) {
      findings.push({ category: 'SOCIAL_MEDIA', entity: 'social_channel', confidence: 0.92, severity: 'HIGH' });
      break;
    }
  }

  // 7. Spam / Flood / Gibberish
  const alphanumericCount = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  if (alphanumericCount < 2) {
    findings.push({ category: 'SPAM', entity: 'no_legible_content', confidence: 0.99, severity: 'MEDIUM' });
  } else if (/([a-zA-Z0-9])\1{3,}/i.test(text)) {
    findings.push({ category: 'SPAM', entity: 'flood', confidence: 0.95, severity: 'MEDIUM' });
  } else if (/\b.*(asdf|qwerty|zxcv|ghjkl|qazwsx|wsxedc).*\b/i.test(cleanLower)) {
    findings.push({ category: 'SPAM', entity: 'keyboard_smash', confidence: 0.92, severity: 'MEDIUM' });
  } else if (/[bcdfghjklmnñpqrstvwxyz]{5,}/i.test(cleanLower)) {
    findings.push({ category: 'SPAM', entity: 'consonants', confidence: 0.90, severity: 'MEDIUM' });
  } else {
    const words = cleanLower.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    for (const word of words) {
      if (word.length > 26 || (word.length >= 4 && !/[aeiouáéíóúü]/i.test(word) && !/^\d+$/.test(word))) {
        findings.push({ category: 'SPAM', entity: 'gibberish', confidence: 0.92, severity: 'MEDIUM' });
        break;
      }
    }
  }

  // Intención
  const intents: ModerationIntent[] = [];
  if (/\b(llego\s+en|a\s+que\s+hora|minutos|voy\s+en\s+camino|te\s+espero)\b/i.test(cleanLower)) {
    intents.push('SCHEDULING');
  }
  if (/\b(estoy\s+afuera|en\s+la\s+puerta|timbre|porton|departamento|depto|piso|cuadras)\b/i.test(cleanLower)) {
    intents.push('LOCATION_COORDINATION');
  }

  // Si no hay hallazgos
  if (findings.length === 0) {
    return {
      valid: true,
      action: 'ALLOW',
      riskScore: 0,
      confidence: 0.99,
      severity: 'LOW',
      categories: ['UNKNOWN'],
      intents: intents.length > 0 ? intents : ['GENERAL_CONVERSATION'],
      findings: [],
    };
  }

  // Determinación de motivo de bloqueo
  let reason = 'Mensaje no permitido por políticas de seguridad de la plataforma.';
  if (findings.some((f) => f.category === 'CREDENTIAL')) {
    reason = 'Por seguridad, nunca debes compartir contraseñas, claves ni códigos de verificación.';
  } else if (findings.some((f) => f.entity === 'chilean_rut')) {
    reason = 'Por seguridad, no está permitido compartir RUT ni datos personales/financieros.';
  } else if (findings.some((f) => f.category === 'FINANCIAL_DATA')) {
    reason = 'Por seguridad, todos los pagos y transacciones deben procesarse dentro de TratoFácil.';
  } else if (findings.some((f) => f.entity === 'email')) {
    reason = 'Por seguridad, no está permitido compartir correos electrónicos.';
  } else if (findings.some((f) => f.category === 'EXTERNAL_URL')) {
    reason = 'Por seguridad, no está permitido compartir enlaces o páginas web externas.';
  } else if (findings.some((f) => f.entity === 'phone')) {
    reason = 'Por seguridad, no está permitido compartir números de teléfono o datos de contacto.';
  } else if (findings.some((f) => f.category === 'SOCIAL_MEDIA')) {
    reason = 'Por seguridad de la plataforma, todas las comunicaciones deben mantenerse en el chat oficial.';
  } else if (findings.some((f) => f.category === 'SPAM')) {
    const sp = findings.find((f) => f.category === 'SPAM');
    if (sp?.entity === 'no_legible_content') {
      reason = 'Por favor escribe un mensaje comprensible con palabras legibles.';
    } else if (sp?.entity === 'flood') {
      reason = 'El mensaje contiene repetición excesiva de caracteres o palabras no reconocidas.';
    } else if (sp?.entity === 'consonants') {
      reason = 'El mensaje contiene combinaciones de letras no válidas.';
    } else {
      reason = 'El mensaje contiene palabras no válidas o texto sin sentido.';
    }
  }

  const maxSeverity = findings.some((f) => f.severity === 'CRITICAL')
    ? 'CRITICAL'
    : findings.some((f) => f.severity === 'HIGH')
    ? 'HIGH'
    : 'MEDIUM';

  const riskScore = maxSeverity === 'CRITICAL' ? 98 : maxSeverity === 'HIGH' ? 85 : 75;

  return {
    valid: false,
    reason,
    action: 'BLOCK',
    riskScore,
    confidence: 0.95,
    severity: maxSeverity,
    categories: Array.from(new Set(findings.map((f) => f.category))),
    intents,
    findings,
  };
}

export function validateChatMessage(
  rawText: string,
  context?: ChatModerationContext
): ChatModerationResult {
  return evaluateChatMessage(rawText, context);
}
