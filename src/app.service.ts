import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      message: 'API Gestion Boutique Abayas',
      version: '1.0.0',
      documentation: '/api/docs',
      status: 'Running',
    };
  }
}
