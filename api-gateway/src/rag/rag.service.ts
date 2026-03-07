import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AskRagDto } from './dto/ask-rag.dto';

@Injectable()
export class RagService {
  private readonly embeddingsServiceUrl: string;
  private readonly supabaseClient: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    this.embeddingsServiceUrl =
      this.configService.get<string>('EMBEDDINGS_SERVICE_URL') ||
      process.env.EMBEDDINGS_SERVICE_URL ||
      'http://localhost:4008';

    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
    const supabaseServiceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      this.supabaseClient = null;
      return;
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async askRag(dto: AskRagDto) {
    if (!dto?.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!dto?.question || !dto.question.trim()) {
      throw new BadRequestException('question is required');
    }

    await this.assertAdmin(dto.userId);

    const payload = {
      question: dto.question,
      top_k: dto.topK,
      min_similarity: dto.minSimilarity,
      model: dto.model,
      temperature: dto.temperature,
    };

    let response: Response;

    try {
      response = await fetch(`${this.embeddingsServiceUrl}/rag/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ServiceUnavailableException('Embeddings service is unavailable.');
    }

    let body: any = null;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const reason = body?.detail || body?.message || 'RAG request failed.';
      if (response.status === 400) {
        throw new BadRequestException(reason);
      }
      if (response.status === 502) {
        throw new BadGatewayException(reason);
      }
      if (response.status === 503) {
        throw new ServiceUnavailableException(reason);
      }

      throw new InternalServerErrorException(reason);
    }

    return {
      statusCode: 200,
      message: 'RAG answer generated successfully',
      data: body,
      success: true,
    };
  }

  private async assertAdmin(userId: string): Promise<void> {
    if (!this.supabaseClient) {
      throw new InternalServerErrorException(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.',
      );
    }

    const { data, error } = await this.supabaseClient
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('Failed to verify admin role.');
    }

    if (!data) {
      throw new UnauthorizedException('User not found.');
    }

    if (data.role !== 'admin') {
      throw new ForbiddenException('Only admins can access RAG.');
    }
  }
}
