import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecommendationsService {
  private readonly recommendationsServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.recommendationsServiceUrl =
      this.configService.get<string>('RECOMMENDATIONS_SERVICE_URL') ||
      process.env.RECOMMENDATIONS_SERVICE_URL ||
      'http://localhost:4012';
  }

  async getLatest(patientId: string) {
    return this.forwardRequest(`/recommendations/${patientId}`);
  }

  async getHistory(patientId: string, limit: number) {
    return this.forwardRequest(`/recommendations/${patientId}/history?limit=${limit}`);
  }

  async refreshOne(patientId: string) {
    return this.forwardRequest(`/recommendations/${patientId}/refresh`, 'POST');
  }

  async refreshAll() {
    return this.forwardRequest('/recommendations/refresh-all', 'POST');
  }

  private async forwardRequest(path: string, method: 'GET' | 'POST' = 'GET') {
    let response: Response;

    try {
      response = await fetch(`${this.recommendationsServiceUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      throw new ServiceUnavailableException('Recommendations service is unavailable.');
    }

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const reason = body?.detail || body?.message || 'Recommendations request failed.';
      if (response.status === 400) {
        throw new BadRequestException(reason);
      }
      if (response.status === 404) {
        throw new NotFoundException(reason);
      }
      if (response.status === 503) {
        throw new ServiceUnavailableException(reason);
      }
      throw new InternalServerErrorException(reason);
    }

    return body;
  }
}
