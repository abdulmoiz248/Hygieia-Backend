import { Injectable } from '@nestjs/common';
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
    const [{ data, error }, { data: users, error: usersError }] = await Promise.all([
      this.supabase
        .from('lab_technician_profiles')
        .select('*'),
      this.supabase
        .from('users')
        .select('id, email'),
    ])

    if (error) {
      throw new Error(`Failed to fetch lab technicians: ${error.message}`);
    }

    if (usersError) {
      throw new Error(`Failed to fetch lab technician emails: ${usersError.message}`);
    }

    const emailById = new Map((users ?? []).map((user) => [user.id, user.email]))

    return (data ?? []).map((labTechnician) => ({
      ...labTechnician,
      email: emailById.get(String(labTechnician.id)) ?? '',
    }));
  }
}
