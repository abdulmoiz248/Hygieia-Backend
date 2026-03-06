import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { MessagePattern } from '@nestjs/microservices';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // Public endpoint - no auth required
  @MessagePattern({ cmd: 'get_all_faqs' })
  async findAll() {
    const faqs = await this.faqService.findAll();
    return {
      data: faqs,
    };
  }

  @MessagePattern({ cmd: 'get_faq_by_id' })
  async findOne(payload: { id: string }) {
    const faq = await this.faqService.findOne(payload.id);
    return {
      data: faq,
    };
  }

  @MessagePattern({ cmd: 'create_faq' })
  async create(payload: { createFaqDto: CreateFaqDto; userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const faq = await this.faqService.create(payload.createFaqDto, payload.userId);
    return {
      data: faq,
      message: 'FAQ created successfully',
    };
  }

  @MessagePattern({ cmd: 'update_faq' })
  async update(payload: { id: string; updateFaqDto: UpdateFaqDto; userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const faq = await this.faqService.update(payload.id, payload.updateFaqDto, payload.userId);
    return {
      data: faq,
      message: 'FAQ updated successfully',
    };
  }

  @MessagePattern({ cmd: 'delete_faq' })
  async remove(payload: { id: string; userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const result = await this.faqService.remove(payload.id, payload.userId);
    return result;
  }
}
