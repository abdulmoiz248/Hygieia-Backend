import { Controller, Get,Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Doctors')

@Controller('doctors')
export class DoctorsController {
 
  constructor(
      @Inject('AUTH_SERVICE') private readonly Doctors: ClientProxy,
    ) {}

   @Get()
   @ApiOperation({
     summary: 'Get all doctors',
     description: 'Retrieve a list of all doctors including their work email and personal email.',
   })
   @ApiResponse({
     status: 200,
     description: 'Successfully retrieved all doctors',
     schema: {
       example: [
         {
           id: 'uuid',
           name: 'Dr. Smith',
           phone: '1234567890',
           img: 'image_url',
           gender: 'Male',
           dateofbirth: '1990-01-01',
           email: 'doctor@hygieia.com',
           personal_email: 'smith@example.com',
         },
       ],
     },
   })
    async listAll() {
      return firstValueFrom(
        this.Doctors.send({ cmd: 'allDoctors' },{}),
      )
    }
}