import { Module } from '@nestjs/common';
import { BlogpostController } from './blogpost.controller';
import { BlogpostService } from './blogpost.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BlogpostController],
  providers: [BlogpostService],
  exports: [BlogpostService],
})
export class BlogpostModule {}
