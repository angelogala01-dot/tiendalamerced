import {
  buildAccountCreatedEmail,
  buildOrderConfirmation,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  escapeHtml,
  formatPen,
} from './mail.templates';

describe('mail.templates', () => {
  it('escapa HTML en nombres de producto', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('formatea soles', () => {
    expect(formatPen(15)).toMatch(/15/);
  });

  it('arma confirmación de pedido con número y total', () => {
    const email = buildOrderConfirmation({
      orderNumber: 'P-20260820-00001',
      customerName: 'Ana',
      items: [{ name: 'Zapatilla', quantity: 1, unitPrice: 80, subtotal: 80 }],
      subtotal: 80,
      discount: 0,
      shippingCost: 15,
      total: 95,
      shippingAddress: 'Av. Principal 123',
      shippingCity: 'Lima',
      trackUrl: 'http://localhost:3000/pedidos/seguimiento',
    });

    expect(email.subject).toContain('P-20260820-00001');
    expect(email.html).toContain('Zapatilla');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('Ana');
    expect(email.text).toContain('http://localhost:3000/pedidos/seguimiento');
  });

  it('arma bienvenida de cuenta', () => {
    const email = buildWelcomeEmail({
      customerName: 'Luis',
      email: 'luis@correo.com',
      catalogUrl: 'http://localhost:3000/catalogo',
      loginUrl: 'http://localhost:3000/login',
    });

    expect(email.subject).toContain('Bienvenido');
    expect(email.html).toContain('luis@correo.com');
    expect(email.html).toContain('/catalogo');
    expect(email.text).toContain('Luis');
  });

  it('arma alta de cuenta staff con acceso al panel', () => {
    const email = buildAccountCreatedEmail({
      customerName: 'Rosa',
      email: 'rosa@gmail.com',
      roleLabel: 'Vendedor',
      temporaryPassword: 'Temp1234!',
      loginUrl: 'http://localhost:3001/login',
      isStaff: true,
    });

    expect(email.subject).toContain('panel');
    expect(email.html).toContain('rosa@gmail.com');
    expect(email.html).toContain('Temp1234!');
    expect(email.html).toContain('Vendedor');
    expect(email.html).toContain('http://localhost:3001/login');
    expect(email.text).toContain('Rosa');
    expect(email.html).not.toContain('<script>');
  });

  it('arma recuperación de contraseña', () => {
    const email = buildPasswordResetEmail({
      customerName: 'Ana',
      email: 'ana@correo.com',
      resetUrl: 'https://example.com/reset?token=abc',
      expiryHours: 1,
    });

    expect(email.subject).toContain('contraseña');
    expect(email.html).toContain('https://example.com/reset?token=abc');
    expect(email.html).toContain('ana@correo.com');
    expect(email.text).toContain('ignora este correo');
  });
});
