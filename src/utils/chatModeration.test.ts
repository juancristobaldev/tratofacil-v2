import { validateChatMessage } from './chatModeration';

describe('tratofacil-v2 chatModeration utility', () => {
  it('permite mensajes legítimos de coordinación', () => {
    expect(validateChatMessage('Hola, estoy afuera en el portón').valid).toBe(true);
    expect(validateChatMessage('Llego en 5 minutos').valid).toBe(true);
    expect(validateChatMessage('El timbre es el 204').valid).toBe(true);
  });

  it('bloquea números de teléfono y números ofuscados', () => {
    expect(validateChatMessage('+56 9 1234 5678').valid).toBe(false);
    expect(validateChatMessage('9 8 7 6 5 4 3 2 1').valid).toBe(false);
    expect(validateChatMessage('mi wsp es nueve ocho siete seis cinco cuatro').valid).toBe(false);
    expect(validateChatMessage('fono 9 ocho 7 seis 5 cuatro 3 dos 1').valid).toBe(false);
  });

  it('bloquea correos electrónicos', () => {
    expect(validateChatMessage('cliente@gmail.com').valid).toBe(false);
    expect(validateChatMessage('juan [at] hotmail [punto] com').valid).toBe(false);
    expect(validateChatMessage('contacto (arroba) empresa (punto) cl').valid).toBe(false);
  });

  it('bloquea redes sociales, evasión leetspeak y enlaces', () => {
    expect(validateChatMessage('hablemos por wsp').valid).toBe(false);
    expect(validateChatMessage('mi ig es pepe').valid).toBe(false);
    expect(validateChatMessage('háblame al wh4ts4pp').valid).toBe(false);
    expect(validateChatMessage('mi w 5 p').valid).toBe(false);
    expect(validateChatMessage('mi link https://externo.com').valid).toBe(false);
    expect(validateChatMessage('wa.me/56912345678').valid).toBe(false);
  });

  it('bloquea datos financieros, RUT y desintermediación', () => {
    expect(validateChatMessage('mi rut es 12.345.678-9').valid).toBe(false);
    expect(validateChatMessage('transfiéreme a cuenta rut').valid).toBe(false);
    expect(validateChatMessage('Banco Santander cuenta corriente').valid).toBe(false);
    expect(validateChatMessage('paguemos por fuera en efectivo').valid).toBe(false);
    expect(validateChatMessage('tr4nsf3r a mi cu3nt4 rut').valid).toBe(false);
  });

  it('bloquea spam, cadenas repetitivas y gibberish', () => {
    expect(validateChatMessage('aaaaaaahhhhh').valid).toBe(false);
    expect(validateChatMessage('asdfghjkl').valid).toBe(false);
    expect(validateChatMessage('qwertyuiop').valid).toBe(false);
    expect(validateChatMessage('???!!!!').valid).toBe(false);
    expect(validateChatMessage('bcdfgh').valid).toBe(false);
  });
});
