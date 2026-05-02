import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  Inject,
  BadRequestException
} from '@nestjs/common'
import { FileInterceptor ,} from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
@Controller('booked-lab-tests')
export class BookingsController {


  constructor(@Inject('LABS') private client: ClientProxy) {}

  @Post()
  async bookTest(
    @Body()
    body: {
      testId: string
      patientId: string
      scheduledDate: string
      scheduledTime: string
      location?: string
      instructions?: string[]
    }
  ) {
    return await firstValueFrom(this.client.send({ cmd: 'book_test' }, body))
  }

  @Get('patient/:patientId')
  async getPatientBookings(@Param('patientId') patientId: string) {
    return await firstValueFrom(this.client.send({ cmd: 'get_patient_bookings' }, patientId))
  }

  @Patch(':id/cancel')
  async cancelBooking(@Param('id') bookingId: string) {
    return await firstValueFrom(this.client.send({ cmd: 'cancel_booking' }, bookingId))
  }

  @Get('technician/:techId')
  async getTechnicianBookings(@Param('techId') techId: string) {
    return await firstValueFrom(this.client.send({ cmd: 'get_technician_bookings' }, techId))
  }

@Post(':id/upload-scan')
@UseInterceptors(FileInterceptor('file'))
async uploadScan(
  @Param('id') bookingId: string,
  @UploadedFile() file: Express.Multer.File,
  @Body('doctor_name') doctor_name?: string
) {
  if (!file) throw new BadRequestException('File is required');

  // send file buffer or path to microservice
return await firstValueFrom(this.client.send(
  { cmd: 'upload_scan' },
  {
    bookingId,
    fileBuffer: file.buffer.toString('base64'),
    fileName: file.originalname,
    doctor_name,
  }
));


}


  @Post(':id/upload-result')
  async uploadResult(
    @Param('id') bookingId: string,
    @Body()
    body: {
      doctor_name?: string
      title: string
      resultData: string
    }
  ) {
    return await firstValueFrom(this.client.send(
      { cmd: 'upload_result' },
      { bookingId, ...body }
    ))
  }
}
