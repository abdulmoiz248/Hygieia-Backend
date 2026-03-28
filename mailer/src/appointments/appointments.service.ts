import { Injectable } from '@nestjs/common';
import { generateAppointmentConfirmationEmail } from 'src/helpers/generateAppointmentConfirmationEmail'
import { generateAppointmentReminder30MinEmail } from 'src/helpers/generateAppointmentReminder30MinEmail';
import { generateAppointmentTomorrowEmail } from 'src/helpers/generateAppointmentTomorrowEmail';
import { AppointmentDto } from 'src/appointments/dto/appointment.dto';
import { MailService } from 'src/mail/mail.service';
import { AppointmentCancellationDto } from 'src/appointments/dto/appointment-cancellation.dto';
import { generateAppointmentCancellationEmail } from 'src/helpers/generateAppointmentCancellationEmail';
import { AppointmentUpdateDto } from 'src/appointments/dto/appointment-update.dto';
import { generateAppointmentUpdateEmail } from 'src/helpers/generateAppointmentUpdateEmail';
import { AppointmentReviewRequestDto } from 'src/appointments/dto/appointment-review-request.dto';
import { AppointmentReviewSubmittedDto } from 'src/appointments/dto/appointment-review-submitted.dto';
import { generateAppointmentReviewRequestEmail } from 'src/helpers/generateAppointmentReviewRequestEmail';
import { generateAppointmentReviewSubmittedEmail } from 'src/helpers/generateAppointmentReviewSubmittedEmail';

@Injectable()
export class AppointmentsService {

    constructor(private mailService: MailService) {}


async handleAppointment(data: AppointmentDto) {
        console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Confirmation',
            generateAppointmentConfirmationEmail(data)
        );
    }

async handleThirtyMinAppointmentReminder(data: AppointmentDto) {
   console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Reminder - 30 Minutes',
            generateAppointmentReminder30MinEmail(data)
        );
  }

async handleOneDayAppointmentReminder(data: AppointmentDto) {
   console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Reminder - 1 Day',
            generateAppointmentTomorrowEmail(data)
        );
  }

async handleAppointmentCancellation(data: AppointmentCancellationDto) {
   console.log('Handling appointment cancellation in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Cancelled',
            generateAppointmentCancellationEmail(data)
        );
  }

async handleAppointmentUpdate(data: AppointmentUpdateDto) {
   console.log('Handling appointment update in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Updated',
            generateAppointmentUpdateEmail(data)
        );
  }

async handleAppointmentReviewRequest(data: AppointmentReviewRequestDto) {
     console.log('Handling appointment review request email in AppointmentsService:', data);
                await this.mailService.sendMail(
                        data.patient_email,
                        'Please review your appointment',
                        generateAppointmentReviewRequestEmail(data)
                );
    }

async handleAppointmentReviewSubmitted(data: AppointmentReviewSubmittedDto) {
     console.log('Handling appointment review submitted copy email in AppointmentsService:', data);
                await this.mailService.sendMail(
                        data.patient_email,
                        'Copy of your appointment review',
                        generateAppointmentReviewSubmittedEmail(data)
                );
    }
}