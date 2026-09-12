import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  buildAccountCreatedEmail,
  buildOrderConfirmation,
  buildOrderDelivered,
  buildOrderShipped,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  type AccountCreatedEmailContent,
  type OrderEmailContent,
  type PasswordResetEmailContent,
  type WelcomeEmailContent,
} from './mail.templates';

type OrderMailPayload = OrderEmailContent & { orderId: string };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured() {
    return Boolean(this.resend && this.fromAddress());
  }

  storefrontUrl() {
    return (this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  adminUrl() {
    return (this.config.get<string>('ADMIN_URL')?.trim() || 'http://localhost:3001').replace(/\/$/, '');
  }

  async sendWelcome(to: string | null | undefined, payload: WelcomeEmailContent & { userId: string }) {
    const content = buildWelcomeEmail(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `welcome-email/${payload.userId}`,
      tags: [
        { name: 'category', value: 'welcome' },
        { name: 'user_id', value: this.tagValue(payload.userId) },
      ],
    });
  }

  async sendAccountCreated(
    to: string | null | undefined,
    payload: AccountCreatedEmailContent & { userId: string },
  ) {
    const content = buildAccountCreatedEmail(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `account-created/${payload.userId}`,
      tags: [
        { name: 'category', value: 'account-created' },
        { name: 'user_id', value: this.tagValue(payload.userId) },
      ],
    });
  }

  async sendPasswordReset(
    to: string | null | undefined,
    payload: PasswordResetEmailContent & { userId: string; requestId: string },
  ) {
    const content = buildPasswordResetEmail(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `password-reset/${payload.userId}/${payload.requestId}`,
      tags: [
        { name: 'category', value: 'password-reset' },
        { name: 'user_id', value: this.tagValue(payload.userId) },
      ],
    });
  }

  async sendOrderConfirmation(to: string | null | undefined, payload: OrderMailPayload) {
    const content = buildOrderConfirmation(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `order-confirmation/${payload.orderId}`,
      tags: [
        { name: 'category', value: 'order-confirmation' },
        { name: 'order_id', value: this.tagValue(payload.orderId) },
      ],
    });
  }

  async sendOrderShipped(to: string | null | undefined, payload: OrderMailPayload) {
    const content = buildOrderShipped(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `order-shipped/${payload.orderId}`,
      tags: [
        { name: 'category', value: 'order-shipped' },
        { name: 'order_id', value: this.tagValue(payload.orderId) },
      ],
    });
  }

  async sendOrderDelivered(to: string | null | undefined, payload: OrderMailPayload) {
    const content = buildOrderDelivered(payload);
    await this.send({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: `order-delivered/${payload.orderId}`,
      tags: [
        { name: 'category', value: 'order-delivered' },
        { name: 'order_id', value: this.tagValue(payload.orderId) },
      ],
    });
  }

  private fromAddress() {
    return this.config.get<string>('RESEND_FROM')?.trim() ?? '';
  }

  private tagValue(value: string) {
    return value.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 256) || 'unknown';
  }

  private async send(input: {
    to: string | null | undefined;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
    tags: { name: string; value: string }[];
  }) {
    const to = input.to?.trim().toLowerCase();
    if (!to) {
      this.logger.warn(`Correo omitido (${input.idempotencyKey}): sin destinatario`);
      return;
    }

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no está configurada; no se envió el correo');
      return;
    }

    const from = this.fromAddress();
    if (!from) {
      this.logger.warn('RESEND_FROM no está configurada; no se envió el correo');
      return;
    }

    const replyTo = this.config.get<string>('RESEND_REPLY_TO')?.trim();

    let data: { id: string } | null = null;
    let error: { message: string; name?: string } | null = null;

    try {
      const result = await this.resend.emails.send(
        {
          from,
          to: [to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(replyTo ? { replyTo } : {}),
          tags: input.tags,
        },
        { idempotencyKey: input.idempotencyKey.slice(0, 256) },
      );
      data = result.data;
      error = result.error;
    } catch (err) {
      this.logger.warn(
        `Error de red al enviar ${input.idempotencyKey}: ${err instanceof Error ? err.message : 'fallo'}`,
      );
      return;
    }

    if (error) {
      const restricted =
        /only send testing emails|verify a domain|onboarding@resend\.dev/i.test(error.message);
      if (restricted) {
        this.logger.error(
          `Resend bloqueó ${input.idempotencyKey}: ${error.message}. ` +
            'Con onboarding@resend.dev solo llega al correo de tu cuenta Resend. ' +
            'Verifica un dominio en https://resend.com/domains y cambia RESEND_FROM.',
        );
      } else {
        this.logger.warn(`Resend no envió ${input.idempotencyKey}: ${error.message}`);
      }
      return;
    }

    this.logger.log(`Correo enviado ${input.idempotencyKey} (${data?.id ?? 'sin id'})`);
  }
}
