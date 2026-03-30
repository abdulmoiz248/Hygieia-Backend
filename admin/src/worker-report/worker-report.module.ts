import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { WorkerReportController } from './worker-report.controller';
import { WorkerReportService } from './worker-report.service';

@Module({
  imports: [SupabaseModule],
  controllers: [WorkerReportController],
  providers: [WorkerReportService],
})
export class WorkerReportModule {}
