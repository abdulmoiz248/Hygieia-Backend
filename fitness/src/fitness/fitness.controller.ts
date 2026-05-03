import { Controller, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { FitnessService } from './fitness.service'

@Controller()
export class FitnessController {
  private readonly logger = new Logger('FitnessController')

  constructor(private readonly fitnessService: FitnessService) {}

  @MessagePattern({ cmd: 'upsertFitness' })
  async upsertFitness(@Payload() data: { userId: string; updates: any }) {
    this.logger.log('[INFO FITNESS CONTROLLER] Upsert request received')
    return this.fitnessService.upsertFitnessRecord(data.userId, data.updates)
  }

  @MessagePattern({ cmd: 'getAllFitness' })
  async getAllFitness(@Payload() userId: string) {
    this.logger.log('[INFO FITNESS CONTROLLER] GetAll request received')
    return this.fitnessService.getTodayFitnessData(userId)
  }

  @MessagePattern({ cmd: 'getYearlyFitnessStats' })
  async getYearlyFitnessStats(@Payload() userId: string) {
    this.logger.log('[INFO FITNESS CONTROLLER] Yearly stats request received')
    return this.fitnessService.getYearlyFitnessStats(userId)
  }
}
