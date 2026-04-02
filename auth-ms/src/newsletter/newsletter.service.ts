import { BadRequestException, Injectable ,Inject} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';
import { SupabaseClient, createClient } from '@supabase/supabase-js'
@Injectable()
export class NewsletterService {

  private readonly supabase: SupabaseClient
  constructor(private configService: ConfigService,   @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )}

  async subscribe(email: string) {
    const { data, error } = await this.supabase.from('newsletter').insert({ email });
    if (error) throw new BadRequestException(error.message);
    this.mailerClient.emit('welcome-newsletter-email', { email });
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase.from('newsletter').select('*');
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
