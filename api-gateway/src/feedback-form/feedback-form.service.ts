import { Injectable, Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateFeedbackFormDto } from './dto/create-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackFormService {
  private readonly logger = new Logger(FeedbackFormService.name);

  constructor(
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
  ) {}

  async createForm(createDto: CreateFeedbackFormDto, userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'create_feedback_form' }, { createDto, userId }),
      );
    } catch (error) {
      this.logger.error(`Error creating form: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message || 'Failed to create feedback form');
    }
  }

  async getFormById(formId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_feedback_form_by_id' }, { formId }),
      );
    } catch (error) {
      this.logger.error(`Error fetching form ${formId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message || 'Failed to fetch form');
    }
  }

  async submitForm(formId: string, submitDto: SubmitFeedbackDto) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'submit_feedback_form' }, { formId, submitDto }),
      );
    } catch (error) {
      this.logger.error(`Error submitting form ${formId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message || 'Failed to submit feedback');
    }
  }

  async getAllForms(userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_all_feedback_forms' }, { userId }),
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch forms');
    }
  }

  async getFormResults(formId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_feedback_form_results' }, { formId, userId }),
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch form results');
    }
  }
}
