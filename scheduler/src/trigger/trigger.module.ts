import { Module } from '@nestjs/common'
import { TriggerController } from './trigger.controller'
import { NutritionAndAdherenceModule } from '../nutrition-and-adherence/nutrition-and-adherence.module'

@Module({
  imports: [NutritionAndAdherenceModule],
  controllers: [TriggerController],
})
export class TriggerModule {}
