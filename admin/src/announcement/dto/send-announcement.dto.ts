import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const ANNOUNCEMENT_TARGETS = [
  'doctor',
  'nutritionist',
  'pathologist',
  'patient',
  'all_workers',
  'all_users',
] as const;

export type AnnouncementTarget = (typeof ANNOUNCEMENT_TARGETS)[number];

export class SendAnnouncementDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsString()
  @IsIn(ANNOUNCEMENT_TARGETS)
  target: AnnouncementTarget;
}
