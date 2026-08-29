import { containsContactInfo, maskContactInfo } from './sanitizer';

describe('sanitizer', () => {
  it('detects email addresses', () => {
    expect(containsContactInfo('Escríbeme a juan@gmail.com para coordinar')).toBe(true);
    expect(containsContactInfo('Mi correo es soporte.tecnico@empresa.cl')).toBe(true);
  });

  it('detects Chilean and international phone numbers', () => {
    expect(containsContactInfo('Mi número es +56 9 8765 4321')).toBe(true);
    expect(containsContactInfo('Llámame al 987654321')).toBe(true);
    expect(containsContactInfo('Hablemos al 9-1234-5678')).toBe(true);
    expect(containsContactInfo('Tel: +56987654321')).toBe(true);
  });

  it('detects external links and social handles', () => {
    expect(containsContactInfo('Visita https://mifirmadeplomeria.cl')).toBe(true);
    expect(containsContactInfo('Hablame por wa.me/56912345678')).toBe(true);
    expect(containsContactInfo('Búscame en instagram.com/gasfiter_pro')).toBe(true);
  });

  it('passes normal service messages without contact info', () => {
    expect(containsContactInfo('Hola, ya llegué al domicilio y estoy afuera.')).toBe(false);
    expect(containsContactInfo('Necesito cambiar el sifón de la cocina y revisar la llave de paso.')).toBe(false);
  });

  it('masks contact info properly', () => {
    const masked = maskContactInfo('Mi correo es juan@gmail.com y fono +56 9 8765 4321');
    expect(masked).not.toContain('juan@gmail.com');
    expect(masked).not.toContain('+56 9 8765 4321');
    expect(masked).toContain('[contacto oculto por seguridad]');
  });
});
