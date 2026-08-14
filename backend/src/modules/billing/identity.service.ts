import { BadRequestException, Injectable } from '@nestjs/common';
import { DecolectaClient } from './decolecta.client';

export type IdentityLookup = {
  kind: 'dni' | 'ruc';
  document_number: string;
  name: string;
  address?: string;
  status?: string;
  condition?: string;
  district?: string;
  province?: string;
  department?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class IdentityService {
  private readonly cache = new Map<string, { at: number; data: IdentityLookup }>();

  constructor(private readonly decolecta: DecolectaClient) {}

  lookupDni(raw: string) {
    const numero = raw.replace(/\D/g, '');
    if (numero.length !== 8) {
      throw new BadRequestException('El DNI debe tener 8 dígitos');
    }
    return this.cached(`dni:${numero}`, () => this.fetchDni(numero));
  }

  lookupRuc(raw: string) {
    const numero = raw.replace(/\D/g, '');
    if (numero.length !== 11) {
      throw new BadRequestException('El RUC debe tener 11 dígitos');
    }
    return this.cached(`ruc:${numero}`, () => this.fetchRuc(numero));
  }

  private async fetchDni(numero: string): Promise<IdentityLookup> {
    const data = await this.decolecta.lookupDni(numero);
    const error = data.error || data.message;
    const name = this.dniName(data);
    if (!name) {
      throw new BadRequestException(error || 'No se encontró el DNI en RENIEC');
    }
    return {
      kind: 'dni',
      document_number: data.document_number || numero,
      name,
    };
  }

  private async fetchRuc(numero: string): Promise<IdentityLookup> {
    const data = await this.decolecta.lookupRuc(numero);
    const error = data.error || data.message;
    const name = data.razon_social?.trim();
    if (!name) {
      throw new BadRequestException(error || 'No se encontró el RUC en SUNAT');
    }
    return {
      kind: 'ruc',
      document_number: data.numero_documento || numero,
      name,
      address: (data.direccion || data.dirección)?.trim() || undefined,
      status: data.estado,
      condition: data.condicion,
      district: data.distrito,
      province: data.provincia,
      department: data.departamento,
    };
  }

  private dniName(data: {
    full_name?: string;
    first_name?: string;
    first_last_name?: string;
    second_last_name?: string;
  }) {
    if (data.full_name?.trim()) return data.full_name.trim();
    return [data.first_last_name, data.second_last_name, data.first_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');
  }

  private async cached(key: string, loader: () => Promise<IdentityLookup>) {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
    const data = await loader();
    this.cache.set(key, { at: Date.now(), data });
    return data;
  }
}
