import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFeedbackFormDto } from './dto/create-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FeedbackFormService {
  private readonly logger = new Logger(FeedbackFormService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
  ) { }

  private async verifyAdmin(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new BadRequestException('User not found');
    }

    if (data.role !== 'admin') {
      throw new BadRequestException('Only admins can perform this action');
    }
  }

  async createForm(createFeedbackFormDto: CreateFeedbackFormDto, userId: string) {
    this.logger.log(`Admin ${userId} creating feedback form: "${createFeedbackFormDto.title}"`);
    await this.verifyAdmin(userId);

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + createFeedbackFormDto.durationHours);

    const { data: form, error } = await this.supabaseService
      .getClient()
      .from('feedback_forms')
      .insert({
        title: createFeedbackFormDto.title,
        description: createFeedbackFormDto.description,
        questions: createFeedbackFormDto.questions,
        expiry_date: expiryDate.toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create feedback form: ${error.message}`);
      throw new InternalServerErrorException('Failed to create feedback form');
    }

    this.logger.log(`Feedback form created with id=${form.id}. Fetching patient list...`);

    const { data: users, error: userError } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email')
      .eq('role', 'patient');

    if (userError || !users) {
      this.logger.error(`Failed to fetch patients: ${userError?.message}`);
      throw new InternalServerErrorException('Failed to fetch patients');
    }

    const totalPatients = users.length;
    const countToSend = Math.max(1, Math.floor((createFeedbackFormDto.percentageOfUsers / 100) * totalPatients));
    const shuffled = [...users].sort(() => 0.5 - Math.random());
    const emails = shuffled.slice(0, countToSend).map(u => u.email).filter(Boolean);

    this.logger.log(
      `Sending feedback form to ${emails.length} / ${totalPatients} patients (${createFeedbackFormDto.percentageOfUsers}%)`,
    );

    if (emails.length > 0) {
      try {
        const result = await firstValueFrom(
          this.mailerClient.send(
            { cmd: 'send-feedback-form-email' },
            {
              emails,
              formId: form.id,
              title: createFeedbackFormDto.title || 'Hygieia Feedback',
              description: createFeedbackFormDto.description,
              expiryDate: expiryDate.toISOString(),
            },
          ),
        );
        this.logger.log(`Email dispatch result: ${JSON.stringify(result)}`);
      } catch (e) {
        this.logger.error(`Failed to dispatch feedback form emails: ${e?.message}`, e?.stack);
      }
    }

    return { form, recipientsCount: emails.length };
  }

  async getFormById(formId: string) {
    this.logger.log(`Fetching feedback form by id=${formId}`);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) {
      this.logger.error(
        `Supabase error fetching form ${formId}: code=${error.code} message="${error.message}" details="${error.details}" hint="${error.hint}"`,
      );
      throw new NotFoundException(`Feedback form not found: ${error.message}`);
    }

    if (!data) {
      this.logger.warn(`No data returned for form ${formId}`);
      throw new NotFoundException('Feedback form not found');
    }

    this.logger.log(`Successfully fetched form ${formId} (expired=${new Date(data.expiry_date) < new Date()})`);
    return data;
  }

  async submitForm(formId: string, submitDto: SubmitFeedbackDto) {
    this.logger.log(`Submitting feedback for formId: ${formId}, userEmail: ${submitDto.userEmail}`);
    await this.getFormById(formId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_responses')
      .insert({
        form_id: formId,
        user_email: submitDto.userEmail,
        answers: submitDto.answers,
        hygieia_review: submitDto.hygieiaReview,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to submit feedback: ${error.message}`, error.details, error.hint);
      throw new InternalServerErrorException('Failed to submit feedback: ' + error.message);
    }

    this.logger.log(`Successfully submitted feedback for formId: ${formId}`);
    return data;
  }

  async getAllForms(userId: string) {
    this.logger.log(`Fetching all feedback forms for admin ${userId}`);
    await this.verifyAdmin(userId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(
        `Supabase error fetching all forms: code=${error.code} message="${error.message}" details="${error.details}"`,
      );
      throw new InternalServerErrorException(`Failed to fetch forms: ${error.message}`);
    }

    this.logger.log(`Fetched ${data?.length ?? 0} feedback forms`);
    return data;
  }

  async getFormResults(formId: string, userId: string) {
    this.logger.log(`Fetching results for form ${formId} by admin ${userId}`);
    await this.verifyAdmin(userId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_responses')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(
        `Supabase error fetching results for form ${formId}: code=${error.code} message="${error.message}" details="${error.details}"`,
      );
      throw new InternalServerErrorException(`Failed to fetch form results: ${error.message}`);
    }

    this.logger.log(`Fetched ${data?.length ?? 0} responses for form ${formId}`);
    return data;
  }

  async getPublicReviews(limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    this.logger.log(`Fetching public Hygieia reviews limit=${safeLimit} offset=${safeOffset}`);

    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('feedback_responses')
      .select('id, hygieia_review, user_email, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      this.logger.error(`Failed to fetch public reviews: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch reviews');
    }

    return { items: data || [], total: count || 0, limit: safeLimit, offset: safeOffset };
  }
}
