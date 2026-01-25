import { Controller, Get } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {
 
  }

   @MessagePattern({ cmd: 'allDoctors' })
  async getAll() {
    return await  this.doctorsService.findAll()
  }
}
