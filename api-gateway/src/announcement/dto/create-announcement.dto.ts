import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const ANNOUNCEMENT_AUDIENCE = [
  'doctor',
  'nutritionist',
  'pathologist',
  'patient',
  'all_workers',
  'all_users',
] as const;

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCE)[number];

export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Admin user ID used for authorization check',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Announcement message to be sent to matched users',
    example: 'System maintenance will start tonight at 11:00 PM UTC.',
  })
  @IsString()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional notification title',
    example: 'System Announcement',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiProperty({
    description:
      'Target audience. `pathologist` is mapped internally to `lab_technician`. `all_workers` includes doctor, nutritionist, and pathologist (lab technician).',
    enum: ANNOUNCEMENT_AUDIENCE,
    example: 'all_workers',
  })
  @IsString()
  @IsIn(ANNOUNCEMENT_AUDIENCE)
  target: AnnouncementAudience;
}
