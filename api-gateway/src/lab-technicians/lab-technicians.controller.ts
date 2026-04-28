import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Lab Technicians')
@Controller('lab-technicians')
export class LabTechniciansController {
  constructor(@Inject('AUTH_SERVICE') private readonly authService: ClientProxy) {}

  @Get()
  @ApiOperation({
    summary: 'Get all lab technicians',
    description: 'Retrieve a list of all pathologists/lab technicians',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all lab technicians',
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'Dr. Smith',
          phone: '1234567890',
          img: 'image_url',
          gender: 'Male',
          dateofbirth: '1990-01-01',
          created_at: '2026-04-28T00:00:00.000Z',
          email: 'labtech@hygieia.com',
          personal_email: 'smith@example.com',
        },
      ],
    },
  })
  async listAll() {
    return firstValueFrom(this.authService.send({ cmd: 'allLabTechnicians' }, {}));
  }
}
