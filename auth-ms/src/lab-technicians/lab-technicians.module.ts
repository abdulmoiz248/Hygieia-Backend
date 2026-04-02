import { Module } from '@nestjs/common';
import { LabTechniciansService } from './lab-technicians.service';
import { LabTechniciansController } from './lab-technicians.controller';

@Module({
  controllers: [LabTechniciansController],
  providers: [LabTechniciansService],
})
export class LabTechniciansModule {}
