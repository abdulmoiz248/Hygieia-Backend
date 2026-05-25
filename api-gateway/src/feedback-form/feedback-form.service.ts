import { Injectable, Inject, HttpException, InternalServerErrorException, Logger } from '@nestjs/common';
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

  /**
   * Extracts the real error message and status from an RPC error and throws
   * the appropriate HttpException so the gateway returns the correct status
   * code and message to the client.
   */
  private handleRpcError(error: any, context: string): never {
    // RPC exceptions from NestJS microservices arrive as plain objects
    // with shape { statusCode, message, error } or { status, message }
    const rpcResponse = error?.response || error;
    const statusCode = rpcResponse?.statusCode || rpcResponse?.status || 500;
    const message =
      rpcResponse?.message ||
      error?.message ||
      'Unknown error';
    const errorName = rpcResponse?.error || 'Internal Server Error';

    this.logger.error(
      `${context} | status=${statusCode} message="${message}" error="${errorName}"`,
    );
    this.logger.debug(`${context} | Full error object: ${JSON.stringify(error)}`);

    throw new HttpException(
      { statusCode, message, error: errorName },
      statusCode,
    );
  }

  async createForm(createDto: CreateFeedbackFormDto, userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'create_feedback_form' }, { createDto, userId }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error creating feedback form for user ${userId}`);
    }
  }

  async getFormById(formId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_feedback_form_by_id' }, { formId }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error fetching form ${formId}`);
    }
  }

  async submitForm(formId: string, submitDto: SubmitFeedbackDto) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'submit_feedback_form' }, { formId, submitDto }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error submitting form ${formId}`);
    }
  }

  async getAllForms(userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_all_feedback_forms' }, { userId }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error fetching all forms for user ${userId}`);
    }
  }

  async getFormResults(formId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_feedback_form_results' }, { formId, userId }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error fetching results for form ${formId}`);
    }
  }

  async getPublicReviews(limit?: number, offset?: number) {
    try {
      return await firstValueFrom(
        this.adminClient.send({ cmd: 'get_public_reviews' }, { limit, offset }),
      );
    } catch (error) {
      this.handleRpcError(error, `Error fetching public reviews (limit=${limit}, offset=${offset})`);
    }
  }
}

