import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type OpenAiChoice = {
  message?: { content?: string };
};

@Injectable()
export class OpenAiClient {
  private unavailableUntil = 0;

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.getKey()) && Date.now() >= this.unavailableUntil;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const key = this.getKey();
    if (!key) {
      throw new ServiceUnavailableException('OpenAI no está configurado');
    }
    if (Date.now() < this.unavailableUntil) {
      throw new ServiceUnavailableException('OpenAI temporalmente no disponible');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 450,
        messages,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const body = (await res.json().catch(() => null)) as {
      choices?: OpenAiChoice[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const detail = body?.error?.message || `OpenAI no respondió (${res.status})`;
      if (this.isQuotaError(res.status, detail)) {
        this.unavailableUntil = Date.now() + 10 * 60 * 1000;
      }
      throw new ServiceUnavailableException(detail);
    }

    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new ServiceUnavailableException('OpenAI devolvió una respuesta vacía');
    }
    return text;
  }

  private isQuotaError(status: number, detail: string) {
    const lower = detail.toLowerCase();
    return (
      status === 429 ||
      lower.includes('quota') ||
      lower.includes('credits remaining') ||
      lower.includes('insufficient_quota') ||
      lower.includes('billing')
    );
  }

  private getKey() {
    return this.config.get<string>('OPENAI_API_KEY')?.trim() ?? '';
  }
}
