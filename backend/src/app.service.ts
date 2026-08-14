import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      service: 'La Merced PyK API',
      status: 'ok',
      message: 'Esta es la API, no la tienda ni la app móvil.',
      health: '/api/v1/health',
      docs: '/api/docs',
      store: 'http://localhost:3000',
      admin: 'http://localhost:3001',
      mobile: 'Ejecuta en mobile_app: flutter run -d chrome',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'La Merced PyK API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
