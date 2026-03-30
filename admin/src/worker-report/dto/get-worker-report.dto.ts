import { IsUUID } from 'class-validator';

export class GetWorkerReportDto {
  @IsUUID()
  workerId: string;
}
