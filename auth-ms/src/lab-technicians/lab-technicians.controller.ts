import { Controller } from '@nestjs/common';
import { LabTechniciansService } from './lab-technicians.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('lab-technicians')
export class LabTechniciansController {
  constructor(private readonly labTechniciansService: LabTechniciansService) {}

  @MessagePattern({ cmd: 'allLabTechnicians' })
  async getAll() {
    return await this.labTechniciansService.findAll();
  }
}
