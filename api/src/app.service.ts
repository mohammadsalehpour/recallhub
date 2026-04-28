import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'RecallHub API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
