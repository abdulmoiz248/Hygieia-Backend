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
    const recommendationsServiceUrl =
      this.configService.get<string>('RECOMMENDATIONS_SERVICE_URL') ||
      process.env.RECOMMENDATIONS_SERVICE_URL ||
      'http://localhost:4012';

    this.recommendationsServiceUrl = recommendationsServiceUrl.replace(/\/$/, '');
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

  async getModelStatus() {
    return this.forwardRequest('/model/status');
  }

  async predictAcne(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    return this.forwardMultipartRequest('/predict-acne', file, 'Acne prediction request failed.');
  }

  async predictDental(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    return this.forwardMultipartRequest('/predict-dental', file, 'Dental prediction request failed.');
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

  private async forwardMultipartRequest(path: string, file: Express.Multer.File, fallbackErrorMessage: string) {
    const formData = new FormData();
    formData.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);

    let response: Response;

    try {
      response = await fetch(`${this.recommendationsServiceUrl}${path}`, {
        method: 'POST',
        body: formData,
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
      const reason = body?.detail || body?.message || fallbackErrorMessage;
      if (response.status === 400) {
        throw new BadRequestException(reason);
      }
      if (response.status === 503) {
        throw new ServiceUnavailableException(reason);
      }
      throw new InternalServerErrorException(reason);
    }

    return body;
  }
}
