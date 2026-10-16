/**
 * Utilidades de sanitización y detección de información de contacto.
 * Previene la fuga de datos fuera de la plataforma (teléfonos, emails, enlaces externos/redes sociales, RUT, datos bancarios).
 */
import { validateChatMessage } from './chatModeration';

// Detección de correos electrónicos
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Detección de números telefónicos
const PHONE_PATTERNS = [
  /(?:\+?56\s?9\s?)?[2-9](?:\s?[\d.-]\s?){7,8}\d/g,
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
  /\b\d{8,12}\b/g,
];

// Detección de URLs y menciones a redes externas / mensajería externa
const EXTERNAL_LINKS_REGEX = /(?:https?:\/\/|www\.)[^\s]+|(?:wa\.me|whatsapp|instagram\.com|ig:|facebook\.com|fb:|t\.me|telegram)[^\s]*/gi;

/**
 * Retorna true si el texto contiene información de contacto, datos financieros, teléfonos,
 * correos, enlaces externos o palabras no permitidas.
 */
export function containsContactInfo(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const moderation = validateChatMessage(text);
  if (!moderation.valid) {
    return true;
  }

  const clean = text.trim();
  if (EMAIL_REGEX.test(clean)) return true;
  EMAIL_REGEX.lastIndex = 0;

  if (EXTERNAL_LINKS_REGEX.test(clean)) return true;
  EXTERNAL_LINKS_REGEX.lastIndex = 0;

  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(clean)) {
      pattern.lastIndex = 0;
      return true;
    }
    pattern.lastIndex = 0;
  }

  const onlyDigits = clean.replace(/\D/g, '');
  if (onlyDigits.length >= 8 && onlyDigits.length <= 13) {
    return true;
  }

  return false;
}

/**
 * Enmascara cualquier número de teléfono, correo o enlace externo con una advertencia de seguridad.
 */
export function maskContactInfo(text: string, placeholder = '[contacto oculto por seguridad]'): string {
  if (!text || typeof text !== 'string') return text;

  let result = text.replace(EMAIL_REGEX, placeholder);
  result = result.replace(EXTERNAL_LINKS_REGEX, placeholder);

  for (const pattern of PHONE_PATTERNS) {
    result = result.replace(pattern, placeholder);
  }

  return result;
}
