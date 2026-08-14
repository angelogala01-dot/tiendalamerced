import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NubefactResponse = {
  errors?: string;
  tipo?: string | number;
  serie?: string;
  numero?: number | string;
  url?: string;
  enlace?: string;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  key?: string;
};

@Injectable()
export class NubefactClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.getUrl() && this.getToken());
  }

  private getUrl() {
    return this.config.get<string>('NUBEFACT_URL')?.trim() ?? '';
  }

  private getToken() {
    return this.config.get<string>('NUBEFACT_TOKEN')?.trim() ?? '';
  }

  async send(payload: Record<string, unknown>): Promise<NubefactResponse> {
    const url = this.getUrl();
    const token = this.getToken();
    if (!url || !token) {
      throw new ServiceUnavailableException(
        'Nubefact no está configurado. Revisa NUBEFACT_URL y NUBEFACT_TOKEN en backend/.env',
      );
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token token="${token}"`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => null)) as NubefactResponse | null;
    if (!body) {
      throw new ServiceUnavailableException(
        `Nubefact no respondió (${res.status})`,
      );
    }
    return body;
  }
}
