import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnnouncementService } from './announcement.service';
import { SendAnnouncementDto } from './dto/send-announcement.dto';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @MessagePattern({ cmd: 'send_announcement' })
  async sendAnnouncement(@Payload() payload: SendAnnouncementDto) {
    return this.announcementService.sendAnnouncement(payload);
  }
}
