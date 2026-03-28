import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { MessagePattern, Payload } from '@nestjs/microservices'
import { AppointmentDto } from 'src/appointments/dto/appointment.dto';
import { AppointmentCancellationDto } from 'src/appointments/dto/appointment-cancellation.dto';
import { AppointmentUpdateDto } from 'src/appointments/dto/appointment-update.dto';
import { AppointmentReviewRequestDto } from 'src/appointments/dto/appointment-review-request.dto';
import { AppointmentReviewSubmittedDto } from 'src/appointments/dto/appointment-review-submitted.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}
  
  @MessagePattern('appointment_created')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointment(@Payload() data: AppointmentDto) {
   await this.appointmentsService.handleAppointment(data)
    
  }

  //handle cancel notification thing

    @MessagePattern('thirty_min_reminder')
     @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleThirtyMinAppointmentReminder(@Payload() data: AppointmentDto) {

   await this.appointmentsService.handleThirtyMinAppointmentReminder(data)

  }

  @MessagePattern('one_day_reminder')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleOneDayAppointmentReminder(@Payload() data: AppointmentDto) {
   await this.appointmentsService.handleOneDayAppointmentReminder(data)
  }

  @MessagePattern('appointment_cancelled')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointmentCancellation(@Payload() data: AppointmentCancellationDto) {
   await this.appointmentsService.handleAppointmentCancellation(data)
  }

  @MessagePattern('appointment_updated')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointmentUpdate(@Payload() data: AppointmentUpdateDto) {
   await this.appointmentsService.handleAppointmentUpdate(data)
  }

  @MessagePattern('appointment_review_request')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointmentReviewRequest(@Payload() data: AppointmentReviewRequestDto) {
    await this.appointmentsService.handleAppointmentReviewRequest(data)
  }

  @MessagePattern('appointment_review_submitted')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointmentReviewSubmitted(@Payload() data: AppointmentReviewSubmittedDto) {
    await this.appointmentsService.handleAppointmentReviewSubmitted(data)
  }
}






