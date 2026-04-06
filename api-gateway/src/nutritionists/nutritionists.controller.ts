import { Controller, Get,Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Nutritionists')

@Controller('nutritionists')
export class NutritionistsController {
 
  constructor(
      @Inject('AUTH_SERVICE') private readonly Nutritionist: ClientProxy,
    ) {}

   @Get()
   @ApiOperation({
     summary: 'Get all nutritionists',
     description: 'Retrieve a list of all nutritionists including their work email and personal email.',
   })
   @ApiResponse({
     status: 200,
     description: 'Successfully retrieved all nutritionists',
     schema: {
       example: [
         {
           id: 'uuid',
           name: 'Dr. Jane',
           phone: '1234567890',
           img: 'image_url',
           gender: 'Female',
           dateofbirth: '1991-01-01',
           email: 'nutritionist@hygieia.com',
           personal_email: 'jane@example.com',
         },
       ],
     },
   })
    async listAll() {
      return firstValueFrom(
        this.Nutritionist.send({ cmd: 'allNutritionist' },{}),
      )
    }
}
