import { Controller, Post, Get, Body, Query, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('fitness')
export class FitnessController {
  constructor(
    @Inject('FITNESS_SERVICE') private readonly fitnessClient: ClientProxy,
  ) {}

  @Post()
  async upsertFitness(
    @Body('userId') userId: string,
    @Body('updates') updates: any,
  ) {
    return firstValueFrom(
      this.fitnessClient.send({ cmd: 'upsertFitness' }, { userId, updates }),
    )
  }

  @Get()
  async getFitness(@Query('userId') userId: string) {
    const response = await firstValueFrom(
      this.fitnessClient.send({ cmd: 'getAllFitness' }, userId),
    )

    const row = Array.isArray(response) ? (response[0] || {}) : (response || {})

    return {
      steps: Number(row.steps || 0),
      water: Number(row.water || 0),
      sleep: Number(row.sleep || 0),
      calories_burned: Number(row.calories_burned || 0),
      calories_intake: Number(row.calories_intake || 0),
      protein: Number(row.protein || 0),
      fat: Number(row.fat || 0),
      carbs: Number(row.carbs || 0),
    }
  }
}
