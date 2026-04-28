import {
  BadRequestException,
  Injectable,
  ForbiddenException,
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

  private async forwardJson(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    body?: object,
    authorization?: string,
  ) {
    let response: Response;
    try {
      const opts: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
        },
      };
      if (body && method !== 'GET' && method !== 'DELETE') {
        (opts as RequestInit).body = JSON.stringify(body);
      }
      response = await fetch(`${this.recommendationsServiceUrl}${path}`, opts);
    } catch {
      throw new ServiceUnavailableException('Recommendations service is unavailable.');
    }
    let out: any = null;
    try {
      out = await response.json();
    } catch {
      out = null;
    }
    if (!response.ok) {
      const reason = out?.detail || out?.message || 'Chat request failed.';
      if (response.status === 400) throw new BadRequestException(reason);
      if (response.status === 403) throw new ForbiddenException(reason);
      if (response.status === 404) throw new NotFoundException(reason);
      if (response.status === 503) throw new ServiceUnavailableException(reason);
      throw new InternalServerErrorException(reason);
    }
    return out;
  }

  async chat(dto: {
    patientId: string;
    messages: { role: string; content: string }[];
    conversationId?: string;
    confirmActionToken?: string;
    authorization?: string;
  }) {
    return this.forwardJson(
      '/chat',
      'POST',
      {
        patient_id: dto.patientId,
        messages: dto.messages,
        conversation_id: dto.conversationId,
        confirm_action_token: dto.confirmActionToken,
      },
      dto.authorization,
    );
  }

  async confirmChat(dto: { patientId: string; conversationId: string; actionToken: string; authorization?: string }) {
    return this.forwardJson('/chat/confirm', 'POST', {
      patient_id: dto.patientId,
      conversation_id: dto.conversationId,
      action_token: dto.actionToken,
    }, dto.authorization);
  }

  async getChatConversations(
    patientId: string,
    query: { limit?: number; before?: string; includeArchived?: boolean; search?: string },
    authorization?: string,
  ) {
    const p = new URLSearchParams();
    if (query.limit !== undefined) p.set('limit', String(query.limit));
    if (query.before) p.set('before', query.before);
    if (query.includeArchived !== undefined) p.set('include_archived', String(query.includeArchived));
    if (query.search) p.set('search', query.search);
    return this.forwardRequest(`/chat/conversations/${encodeURIComponent(patientId)}?${p.toString()}`, 'GET', authorization);
  }

  async getChatHistory(
    patientId: string,
    query: { conversationId?: string; limit: number; before?: string },
    authorization?: string,
  ) {
    const p = new URLSearchParams();
    if (query.conversationId) p.set('conversation_id', query.conversationId);
    p.set('limit', String(query.limit));
    if (query.before) p.set('before', query.before);
    const q = p.toString();
    return this.forwardRequest(`/chat/history/${encodeURIComponent(patientId)}?${q}`, 'GET', authorization);
  }

  async renameChatConversation(
    conversationId: string,
    body: { patientId: string; title: string },
    authorization?: string,
  ) {
    return this.forwardJson(`/chat/${encodeURIComponent(conversationId)}/title`, 'PATCH', body, authorization);
  }

  async unarchiveChatConversation(conversationId: string, body: { patientId: string }, authorization?: string) {
    return this.forwardJson(`/chat/${encodeURIComponent(conversationId)}/unarchive`, 'POST', body, authorization);
  }

  async deleteChat(patientId: string, conversationId: string, authorization?: string) {
    return this.forwardRequest(
      `/chat/${encodeURIComponent(conversationId)}?patient_id=${encodeURIComponent(patientId)}`,
      'DELETE',
      authorization,
    );
  }

  private async forwardRequest(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    authorization?: string,
  ) {
    let response: Response;

    try {
      response = await fetch(`${this.recommendationsServiceUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
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
      if (response.status === 403) {
        throw new ForbiddenException(reason);
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
