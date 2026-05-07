import { Module } from '@nestjs/common'
import { SupabaseModule } from 'src/supabase/supabase.module'
import { ProviderReportController } from './provider-report.controller'
import { ProviderReportService } from './provider-report.service'

@Module({
  imports: [SupabaseModule],
  controllers: [ProviderReportController],
  providers: [ProviderReportService],
})
export class ProviderReportModule {}
