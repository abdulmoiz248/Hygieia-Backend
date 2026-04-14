import { Controller } from '@nestjs/common';
import { CvService } from './cv.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @MessagePattern('cv-received')
  async handleCvRecEmail(@Payload() data) {
    await this.cvService.handleCvRecEmail(data)
  }

  @MessagePattern('cv-shortlisted')
  async handleCvShortlistedEmail(@Payload() data) {
    await this.cvService.handleCvShortlistedEmail(data)
  }

  @MessagePattern('cv-rejected')
  async handleCvRejectedEmail(@Payload() data) {
    await this.cvService.handleCvRejectedEmail(data)
  }
}
