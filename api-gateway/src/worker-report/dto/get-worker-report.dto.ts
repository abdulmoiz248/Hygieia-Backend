import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetWorkerReportDto {
  @ApiProperty({
    description: 'Admin user ID used for authorization check',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Worker user ID for which report should be generated',
    example: '1f6b3e2c-1842-4e75-a3b0-cd5224c1c129',
  })
  @IsUUID()
  workerId: string;
}
