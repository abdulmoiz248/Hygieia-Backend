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
    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Feedback form not found');
    }

    if (new Date(data.expiry_date) < new Date()) {
      throw new BadRequestException('Feedback form has expired');
    }

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
    await this.verifyAdmin(userId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch forms');
    }

    return data;
  }

  async getFormResults(formId: string, userId: string) {
    await this.verifyAdmin(userId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('feedback_responses')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch form results');
    }

    return data;
  }
}
