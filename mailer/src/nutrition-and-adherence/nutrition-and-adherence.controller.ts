import { Controller, UsePipes, ValidationPipe } from '@nestjs/common'
import { NutritionAndAdherenceService } from './nutrition-and-adherence.service'
import { MessagePattern, Payload } from '@nestjs/microservices'

@Controller('nutrition-and-adherence')
export class NutritionAndAdherenceController {
  constructor(private readonly nutritionAndAdherenceService: NutritionAndAdherenceService) {}

  @MessagePattern('send_nutrition_summary')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleNutritionSummary(@Payload() data: any) {
    await this.nutritionAndAdherenceService.handleNutritionSummary(data)
  }

  @MessagePattern('send_medicine_reminder')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleMedicineReminder(@Payload() data: any) {
    await this.nutritionAndAdherenceService.handleMedicineReminder(data)
  }
}
