import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqResponseDto } from './dto/api-response.dto';

@Injectable()
export class FaqService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<FaqResponseDto[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        throw new InternalServerErrorException('Failed to fetch FAQs');
      }

      return data || [];
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch FAQs');
    }
  }

  async findOne(id: string): Promise<FaqResponseDto> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('faqs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new NotFoundException(`FAQ with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch FAQ');
    }
  }

  async create(createFaqDto: CreateFaqDto, userId: string): Promise<FaqResponseDto> {
    try {
      // Verify user is admin
      await this.verifyAdmin(userId);

      const { data, error } = await this.supabaseService
        .getClient()
        .from('faqs')
        .insert({
          question: createFaqDto.question,
          answer: createFaqDto.answer,
          order_index: createFaqDto.order_index || 0,
        })
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException('Failed to create FAQ');
      }

      return data;
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create FAQ');
    }
  }

  async update(id: string, updateFaqDto: UpdateFaqDto, userId: string): Promise<FaqResponseDto> {
    try {
      // Verify user is admin
      await this.verifyAdmin(userId);

      // Check if FAQ exists
      await this.findOne(id);

      const { data, error } = await this.supabaseService
        .getClient()
        .from('faqs')
        .update({
          ...updateFaqDto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException('Failed to update FAQ');
      }

      return data;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update FAQ');
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    try {
      // Verify user is admin
      await this.verifyAdmin(userId);

      // Check if FAQ exists
      await this.findOne(id);

      const { error } = await this.supabaseService
        .getClient()
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) {
        throw new InternalServerErrorException('Failed to delete FAQ');
      }

      return { message: 'FAQ deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete FAQ');
    }
  }

  private async verifyAdmin(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('patient_profile')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new BadRequestException('User not found');
    }

    if (data.role !== 'admin') {
      throw new BadRequestException('Only admins can perform this action');
    }
  }
}
