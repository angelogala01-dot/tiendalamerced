export type OrderEmailItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderEmailContent = {
  orderNumber: string;
  customerName?: string | null;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  trackUrl: string;
};

export type WelcomeEmailContent = {
  customerName?: string | null;
  email: string;
  catalogUrl: string;
  loginUrl: string;
};

export type PasswordResetEmailContent = {
  customerName?: string | null;
  email: string;
  resetUrl: string;
  expiryHours?: number;
};

export type AccountCreatedEmailContent = {
  customerName?: string | null;
  email: string;
  roleLabel: string;
  temporaryPassword: string;
  loginUrl: string;
  isStaff: boolean;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatPen(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0);
}

function greeting(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? `Hola ${trimmed},` : 'Hola,';
}

function isPickup(payload: Pick<OrderEmailContent, 'shippingCity'>) {
  return (payload.shippingCity ?? '').toLowerCase().includes('retiro en tienda');
}

function addressLine(payload: OrderEmailContent) {
  return [payload.shippingAddress, payload.shippingCity].filter(Boolean).join(', ');
}

function itemsText(items: OrderEmailItem[]) {
  if (!items.length) return '—';
  return items
    .map((item) => `${item.quantity} × ${item.name} (${formatPen(item.subtotal)})`)
    .join('\n');
}

function itemsHtml(items: OrderEmailItem[]) {
  if (!items.length) {
    return '<tr><td colspan="3" style="padding:10px 0;color:#6b5e52;">Sin ítems</td></tr>';
  }

  return items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eadfd3;color:#2c2118;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eadfd3;text-align:center;color:#6b5e52;">${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eadfd3;text-align:right;color:#2c2118;">${formatPen(item.subtotal)}</td>
      </tr>`,
    )
    .join('');
}

function layout(opts: {
  preview: string;
  heading: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  footnote?: string;
}) {
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;margin-top:24px;background:#c45c26;color:#fff7ed;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:14px;font-weight:bold;box-sizing:border-box;min-height:44px;line-height:16px;">${escapeHtml(opts.ctaLabel)}</a>`
      : '';
  const footnote = opts.footnote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8a7a6c;">${opts.footnote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c45c26;">La Merced PyK</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#2c2118;">${escapeHtml(opts.heading)}</h1>
                ${opts.body}
                ${cta}
                ${footnote}
                <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#8a7a6c;">
                  Multiservicios La Merced PyK S.A.C. · info@lamerced.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function totalsHtml(payload: OrderEmailContent) {
  const discountRow =
    payload.discount > 0
      ? `<tr><td style="padding:4px 0;color:#6b5e52;">Descuento</td><td style="padding:4px 0;text-align:right;color:#2c2118;">− ${formatPen(payload.discount)}</td></tr>`
      : '';
  const address = addressLine(payload);
  const addressHtml = address
    ? `<p style="margin:16px 0 0;font-size:14px;color:#6b5e52;">${isPickup(payload) ? 'Retiro' : 'Entrega'}: ${escapeHtml(address)}</p>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td style="padding:8px 0;font-size:12px;color:#8a7a6c;border-bottom:1px solid #eadfd3;">Producto</td>
        <td style="padding:8px;font-size:12px;color:#8a7a6c;text-align:center;border-bottom:1px solid #eadfd3;">Cant.</td>
        <td style="padding:8px 0;font-size:12px;color:#8a7a6c;text-align:right;border-bottom:1px solid #eadfd3;">Importe</td>
      </tr>
      ${itemsHtml(payload.items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b5e52;">Subtotal</td><td style="padding:4px 0;text-align:right;color:#2c2118;">${formatPen(payload.subtotal)}</td></tr>
      ${discountRow}
      <tr><td style="padding:4px 0;color:#6b5e52;">${isPickup(payload) ? 'Retiro' : 'Envío'}</td><td style="padding:4px 0;text-align:right;color:#2c2118;">${isPickup(payload) ? 'Gratis' : formatPen(payload.shippingCost)}</td></tr>
      <tr><td style="padding:10px 0 0;font-weight:bold;color:#2c2118;">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:bold;color:#2c2118;">${formatPen(payload.total)}</td></tr>
    </table>
    ${addressHtml}`;
}

export function buildWelcomeEmail(payload: WelcomeEmailContent) {
  const subject = 'Bienvenido a La Merced PyK';
  const preview = 'Tu cuenta ya está lista. Explora el catálogo y compra con descuento de bienvenida.';
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      Creamos tu cuenta con el correo <strong>${escapeHtml(payload.email)}</strong>. Ya puedes comprar calzado y ropa en nuestra tienda.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#4a3d32;">
      Si eres cliente nuevo, revisa las promociones de bienvenida al iniciar sesión.
    </p>`;

  const text = [
    greeting(payload.customerName),
    '',
    `Creamos tu cuenta con el correo ${payload.email}.`,
    'Ya puedes comprar en La Merced PyK.',
    '',
    `Catálogo: ${payload.catalogUrl}`,
    `Iniciar sesión: ${payload.loginUrl}`,
    '',
    'La Merced PyK · info@lamerced.com',
  ].join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: subject,
      body,
      ctaUrl: payload.catalogUrl,
      ctaLabel: 'Ver catálogo',
      footnote: `¿Ya tienes sesión? Entra en ${escapeHtml(payload.loginUrl)}`,
    }),
    text,
  };
}

export function buildAccountCreatedEmail(payload: AccountCreatedEmailContent) {
  const subject = payload.isStaff
    ? 'Tu acceso al panel de La Merced PyK'
    : 'Tu cuenta en La Merced PyK está lista';
  const preview = payload.isStaff
    ? 'Un administrador creó tu usuario. Entra al panel con los datos de este correo.'
    : 'Un administrador creó tu cuenta. Ya puedes iniciar sesión.';
  const intro = payload.isStaff
    ? `Un administrador creó tu usuario de personal (${escapeHtml(payload.roleLabel)}) con el correo <strong>${escapeHtml(payload.email)}</strong>.`
    : `Un administrador creó tu cuenta con el correo <strong>${escapeHtml(payload.email)}</strong>.`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      ${intro}
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4a3d32;">Tus datos de acceso:</p>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#2c2118;"><strong>Correo:</strong> ${escapeHtml(payload.email)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2c2118;"><strong>Contraseña temporal:</strong> ${escapeHtml(payload.temporaryPassword)}</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#4a3d32;">
      Cámbiala después de iniciar sesión. No compartas este correo.
    </p>`;

  const text = [
    greeting(payload.customerName),
    '',
    payload.isStaff
      ? `Un administrador creó tu usuario de personal (${payload.roleLabel}) con el correo ${payload.email}.`
      : `Un administrador creó tu cuenta con el correo ${payload.email}.`,
    '',
    'Datos de acceso:',
    `Correo: ${payload.email}`,
    `Contraseña temporal: ${payload.temporaryPassword}`,
    '',
    `Iniciar sesión: ${payload.loginUrl}`,
    'Cámbiala después de iniciar sesión.',
    '',
    'La Merced PyK · info@lamerced.com',
  ].join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: subject,
      body,
      ctaUrl: payload.loginUrl,
      ctaLabel: payload.isStaff ? 'Entrar al panel' : 'Iniciar sesión',
      footnote: 'Si no esperabas esta cuenta, avisa al administrador y no uses estos datos.',
    }),
    text,
  };
}

export function buildPasswordResetEmail(payload: PasswordResetEmailContent) {
  const hours = payload.expiryHours ?? 1;
  const subject = 'Restablece tu contraseña — La Merced';
  const preview = `Este enlace vence en ${hours} hora${hours === 1 ? '' : 's'}.`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      Recibimos una solicitud para restablecer la contraseña de <strong>${escapeHtml(payload.email)}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#4a3d32;">
      El enlace es de un solo uso y vence en ${hours} hora${hours === 1 ? '' : 's'}.
    </p>`;

  const text = [
    greeting(payload.customerName),
    '',
    `Restablece la contraseña de ${payload.email}:`,
    payload.resetUrl,
    '',
    `El enlace vence en ${hours} hora${hours === 1 ? '' : 's'} y es de un solo uso.`,
    'Si no pediste este cambio, ignora este correo.',
    '',
    'La Merced PyK · info@lamerced.com',
  ].join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: 'Restablecer contraseña',
      body,
      ctaUrl: payload.resetUrl,
      ctaLabel: 'Crear nueva contraseña',
      footnote:
        'Si no pediste este cambio, puedes ignorar este correo. Tu contraseña no se modifica hasta que uses el enlace.',
    }),
    text,
  };
}

export function buildOrderConfirmation(payload: OrderEmailContent) {
  const orderNumber = payload.orderNumber || 'tu pedido';
  const subject = `Confirmamos tu pedido ${orderNumber}`;
  const preview = `Pedido ${orderNumber} registrado. Total ${formatPen(payload.total)}.`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      Recibimos tu pedido <strong>${escapeHtml(orderNumber)}</strong>. Ya estamos preparándolo.
    </p>
    ${totalsHtml(payload)}`;

  const text = [
    greeting(payload.customerName),
    '',
    `Recibimos tu pedido ${orderNumber}. Ya estamos preparándolo.`,
    '',
    itemsText(payload.items),
    `Subtotal: ${formatPen(payload.subtotal)}`,
    payload.discount > 0 ? `Descuento: − ${formatPen(payload.discount)}` : null,
    isPickup(payload) ? 'Retiro: Gratis' : `Envío: ${formatPen(payload.shippingCost)}`,
    `Total: ${formatPen(payload.total)}`,
    addressLine(payload) ? `Entrega: ${addressLine(payload)}` : null,
    '',
    `Seguimiento: ${payload.trackUrl}`,
    '',
    'La Merced PyK · info@lamerced.com',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: subject,
      body,
      ctaUrl: payload.trackUrl,
      ctaLabel: 'Ver seguimiento',
    }),
    text,
  };
}

export function buildOrderShipped(payload: OrderEmailContent) {
  const orderNumber = payload.orderNumber || 'tu pedido';
  const subject = `Tu pedido ${orderNumber} va en camino`;
  const preview = `El pedido ${orderNumber} salió a entrega.`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      El pedido <strong>${escapeHtml(orderNumber)}</strong> ya salió a entrega.
    </p>
    ${totalsHtml(payload)}`;

  const text = [
    greeting(payload.customerName),
    '',
    `El pedido ${orderNumber} ya salió a entrega.`,
    addressLine(payload) ? `Entrega: ${addressLine(payload)}` : null,
    '',
    `Seguimiento: ${payload.trackUrl}`,
    '',
    'La Merced PyK · info@lamerced.com',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: subject,
      body,
      ctaUrl: payload.trackUrl,
      ctaLabel: 'Rastrear pedido',
    }),
    text,
  };
}

export function buildOrderDelivered(payload: OrderEmailContent) {
  const orderNumber = payload.orderNumber || 'tu pedido';
  const subject = `Tu pedido ${orderNumber} fue entregado`;
  const preview = `Confirmamos la entrega del pedido ${orderNumber}.`;
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2118;">${escapeHtml(greeting(payload.customerName))}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d32;">
      Confirmamos que el pedido <strong>${escapeHtml(orderNumber)}</strong> ya fue entregado. Gracias por comprar en La Merced.
    </p>
    ${totalsHtml(payload)}`;

  const text = [
    greeting(payload.customerName),
    '',
    `Confirmamos que el pedido ${orderNumber} ya fue entregado.`,
    '',
    `Ver pedidos: ${payload.trackUrl}`,
    '',
    'La Merced PyK · info@lamerced.com',
  ].join('\n');

  return {
    subject,
    html: layout({
      preview,
      heading: subject,
      body,
      ctaUrl: payload.trackUrl,
      ctaLabel: 'Ver mis pedidos',
    }),
    text,
  };
}
