import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class LabTechniciansService {
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('lab_technician_profiles')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch lab technicians: ${error.message}`);
    }

    return data;
  }
}
