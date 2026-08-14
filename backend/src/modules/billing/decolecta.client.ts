import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DecolectaDni = {
  first_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  full_name?: string;
  document_number?: string;
  error?: string;
  message?: string;
};

export type DecolectaRuc = {
  razon_social?: string;
  numero_documento?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  dirección?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  error?: string;
  message?: string;
};

@Injectable()
export class DecolectaClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.getToken());
  }

  lookupDni(numero: string) {
    return this.get<DecolectaDni>(`/reniec/dni?numero=${encodeURIComponent(numero)}`);
  }

  lookupRuc(numero: string) {
    return this.get<DecolectaRuc>(`/sunat/ruc?numero=${encodeURIComponent(numero)}`);
  }

  private getBaseUrl() {
    return (
      this.config.get<string>('DECOLECTA_URL')?.trim() ||
      'https://api.decolecta.com/v1'
    ).replace(/\/$/, '');
  }

  private getToken() {
    return this.config.get<string>('DECOLECTA_TOKEN')?.trim() ?? '';
  }

  private async get<T>(path: string): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new ServiceUnavailableException(
        'La consulta de DNI/RUC no está configurada. Revisa DECOLECTA_TOKEN en backend/.env',
      );
    }

    const res = await fetch(`${this.getBaseUrl()}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const body = (await res.json().catch(() => null)) as T | null;
    if (!body) {
      throw new ServiceUnavailableException(`Decolecta no respondió (${res.status})`);
    }
    return body;
  }
}
