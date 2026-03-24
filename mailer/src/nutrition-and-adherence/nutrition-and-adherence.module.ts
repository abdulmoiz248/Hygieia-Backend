import { Module } from '@nestjs/common'
import { NutritionAndAdherenceService } from './nutrition-and-adherence.service'
import { NutritionAndAdherenceController } from './nutrition-and-adherence.controller'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [MailModule],
  controllers: [NutritionAndAdherenceController],
  providers: [NutritionAndAdherenceService],
})
export class NutritionAndAdherenceMailerModule {}
