import { IsUUID } from 'class-validator'

export class GetProviderReportsDto {
  @IsUUID()
  reportedProviderId: string
}
