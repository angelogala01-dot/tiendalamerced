import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const PERU_PHONE_RE = /^9\d{8}$/;
export const PERU_DNI_RE = /^\d{8}$/;
export const PERU_RUC_RE = /^\d{11}$/;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export const toDigitsOrUndefined = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const digits = digitsOnly(value);
  return digits || undefined;
};

export function isPeruPhone(value: string) {
  return PERU_PHONE_RE.test(digitsOnly(value));
}

export function isPeruDni(value: string) {
  return PERU_DNI_RE.test(digitsOnly(value));
}

export function isPeruRuc(value: string) {
  return PERU_RUC_RE.test(digitsOnly(value));
}

export function isPeruTaxId(value: string) {
  const digits = digitsOnly(value);
  return PERU_DNI_RE.test(digits) || PERU_RUC_RE.test(digits);
}

function isBlank(value: unknown): value is null | undefined | '' {
  return value === null || value === undefined || value === '';
}

export function IsPeruPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPeruPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (isBlank(value)) return true;
          return typeof value === 'string' && isPeruPhone(value);
        },
        defaultMessage() {
          return 'El celular debe tener 9 dígitos y empezar con 9';
        },
      },
    });
  };
}

export function IsPeruDocument(
  typeField = 'document_type',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPeruDocument',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (isBlank(value)) return true;
          if (typeof value !== 'string') return false;
          const obj = args.object as Record<string, unknown>;
          const type = String(obj[typeField] || '').toUpperCase();
          const voucher = String(obj.voucher_type || obj.kind || '').toLowerCase();
          if (type === 'RUC' || voucher === 'factura') return isPeruRuc(value);
          return isPeruDni(value);
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const type = String(obj[typeField] || '').toUpperCase();
          const voucher = String(obj.voucher_type || obj.kind || '').toLowerCase();
          if (type === 'RUC' || voucher === 'factura') return 'El RUC debe tener 11 dígitos';
          return 'El DNI debe tener 8 dígitos';
        },
      },
    });
  };
}

export function IsPeruTaxId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPeruTaxId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (isBlank(value)) return true;
          return typeof value === 'string' && isPeruTaxId(value);
        },
        defaultMessage() {
          return 'El RUC debe tener 11 dígitos o el DNI 8 dígitos';
        },
      },
    });
  };
}
