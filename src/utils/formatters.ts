export const formatRut = (rut: string) => {
  let clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  return `${body}-${dv}`;
};

export const formatDate = (date: string) => {
  let clean = date.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
};

export const formatPhoneDisplay = (phone: string) => {
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 0) return '';
  
  if (clean.startsWith('56')) clean = clean.slice(2);
  if (clean.startsWith('9')) clean = clean.slice(1);
  
  let res = '+56 9';
  if (clean.length > 0) res += ` ${clean.slice(0, 4)}`;
  if (clean.length > 4) res += ` ${clean.slice(4, 8)}`;
  return res;
};

export const parsePhoneValue = (phone: string) => {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('56')) clean = clean.slice(2);
  if (clean.startsWith('9')) clean = clean.slice(1);
  
  if (clean.length === 0) return '';
  return `+569${clean.slice(0, 8)}`;
};
