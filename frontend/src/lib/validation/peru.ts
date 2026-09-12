export const PERU_PHONE_RE = /^9\d{8}$/;
export const PERU_DNI_RE = /^\d{8}$/;
export const PERU_RUC_RE = /^\d{11}$/;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function restrictDigits(value: string, max: number) {
  return digitsOnly(value).slice(0, max);
}

export function isPeruPhone(value: string) {
  return PERU_PHONE_RE.test(digitsOnly(value));
}

export function isPeruDni(value: string) {
  return PERU_DNI_RE.test(digitsOnly(value));
}

export function isPeruRuc(value: string) {
  return PERU_RUC_RE.test(digitsOnly(value));
}

export function isOptionalPeruPhone(value: string | undefined) {
  const digits = digitsOnly(value ?? '');
  return digits.length === 0 || isPeruPhone(digits);
}

export function isOptionalPeruDni(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 0 || isPeruDni(digits);
}

export function peruPhoneMessage() {
  return 'El celular debe tener 9 dígitos y empezar con 9';
}

export function peruDniMessage() {
  return 'El DNI debe tener 8 dígitos';
}

export function peruRucMessage() {
  return 'El RUC debe tener 11 dígitos';
}
