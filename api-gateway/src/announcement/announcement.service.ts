import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(@Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy) {}

  async dispatchAnnouncement(dto: CreateAnnouncementDto) {
    try {
      const response = await firstValueFrom(
        this.adminClient.send(
          { cmd: 'send_announcement' },
        {
          message: dto.message,
          title: dto.title,
          target: dto.target,
        },
      ));

      return {
        statusCode: 201,
        message: 'Announcement dispatched successfully',
        data: response,
        success: true,
      };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to dispatch announcement';
      this.logger.error(`Announcement dispatch failed: ${errorMessage}`);
      throw new BadRequestException(errorMessage);
    }
  }
}
