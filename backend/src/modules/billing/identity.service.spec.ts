import { IdentityService } from './identity.service';

describe('IdentityService name mapping', () => {
  const service = new IdentityService({
    lookupDni: async () => ({
      first_name: 'ROXANA KARINA',
      first_last_name: 'DELGADO',
      second_last_name: 'HUAMANI',
      document_number: '46027897',
    }),
    lookupRuc: async () => ({
      razon_social: 'REXTIE S.A.C.',
      numero_documento: '20601030013',
      direccion: 'AV. JOSE GALVEZ',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
    }),
  } as never);

  it('arma el nombre desde DNI RENIEC', async () => {
    const dni = await service.lookupDni('46027897');
    expect(dni.name).toBe('DELGADO HUAMANI ROXANA KARINA');
    expect(dni.kind).toBe('dni');
  });

  it('devuelve razón social y dirección del RUC', async () => {
    const ruc = await service.lookupRuc('20601030013');
    expect(ruc.name).toBe('REXTIE S.A.C.');
    expect(ruc.address).toBe('AV. JOSE GALVEZ');
  });
});
