import { Controller, BadRequestException } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FeedbackFormService } from './feedback-form.service';
import { CreateFeedbackFormDto } from './dto/create-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Controller('feedback-form')
export class FeedbackFormController {
  constructor(private readonly feedbackFormService: FeedbackFormService) {}

  @MessagePattern({ cmd: 'create_feedback_form' })
  async createForm(payload: { createDto: CreateFeedbackFormDto; userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const result = await this.feedbackFormService.createForm(payload.createDto, payload.userId);
    return { data: result, message: 'Form created and sent successfully' };
  }

  @MessagePattern({ cmd: 'get_feedback_form_by_id' })
  async getFormById(payload: { formId: string }) {
    const data = await this.feedbackFormService.getFormById(payload.formId);
    return { data };
  }

  @MessagePattern({ cmd: 'submit_feedback_form' })
  async submitForm(payload: { formId: string; submitDto: SubmitFeedbackDto }) {
    const data = await this.feedbackFormService.submitForm(payload.formId, payload.submitDto);
    return { data, message: 'Feedback submitted successfully' };
  }

  @MessagePattern({ cmd: 'get_all_feedback_forms' })
  async getAllForms(payload: { userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const data = await this.feedbackFormService.getAllForms(payload.userId);
    return { data };
  }

  @MessagePattern({ cmd: 'get_feedback_form_results' })
  async getFormResults(payload: { formId: string; userId: string }) {
    if (!payload.userId) {
      throw new BadRequestException('User ID is required');
    }
    const data = await this.feedbackFormService.getFormResults(payload.formId, payload.userId);
    return { data };
  }

  @MessagePattern({ cmd: 'get_public_reviews' })
  async getPublicReviews(payload: { limit?: number; offset?: number }) {
    const data = await this.feedbackFormService.getPublicReviews(payload.limit, payload.offset);
    return { data };
  }
}
