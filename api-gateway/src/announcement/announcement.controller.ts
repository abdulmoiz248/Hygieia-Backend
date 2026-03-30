import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('Announcement')
@Controller('announcement')
export class AnnouncementController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly announcementService: AnnouncementService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Create role-based announcement (Admin only)',
    description:
      'Sends an announcement notification to users filtered by target audience (doctor, nutritionist, pathologist, patient, all_workers, all_users).',
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement dispatched successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Announcement dispatched successfully',
        data: {
          success: true,
          recipientCount: 120,
          insertedCount: 120,
          target: 'all_workers',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - user is not an admin',
    schema: {
      example: {
        statusCode: 401,
        message: 'Only admins can perform this action',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or scheduler dispatch failure',
    schema: {
      example: {
        statusCode: 400,
        message: 'Failed to dispatch announcement',
        success: false,
      },
    },
  })
  async createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    try {
      await this.verifyAdmin(dto.userId);
      return await this.announcementService.dispatchAnnouncement(dto);
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException(error?.message || 'Failed to create announcement');
    }
  }

  private async verifyAdmin(userId: string): Promise<void> {
    try {
      const userResult = await firstValueFrom(
        this.authClient.send({ cmd: 'user-data' }, { id: userId, role: 'admin' }),
      );

      if (!userResult?.data?.role || userResult.data.role !== 'admin') {
        throw new UnauthorizedException('Only admins can perform this action');
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Only admins can perform this action');
    }
  }
}
