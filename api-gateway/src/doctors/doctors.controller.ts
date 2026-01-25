import { Controller, Get,Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('doctors')
export class DoctorsController {
 
  constructor(
      @Inject('AUTH_SERVICE') private readonly Doctors: ClientProxy,
    ) {}

   @Get()
    async listAll() {
      return firstValueFrom(
        this.Doctors.send({ cmd: 'allDoctors' },{}),
      )
    }
}