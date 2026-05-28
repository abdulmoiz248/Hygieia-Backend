import { ApiProperty } from '@nestjs/swagger'

export class TotalUserCountDataDto {
  @ApiProperty({
    example: 241,
    minimum: 0,
    description: 'Total number of registered users on the platform',
  })
  totalUsers: number
}

export class TotalUserCountResponseDto {
  @ApiProperty({ example: true })
  success: boolean

  @ApiProperty({ example: 'Total user count fetched successfully' })
  message: string

  @ApiProperty({ type: TotalUserCountDataDto })
  data: TotalUserCountDataDto

  @ApiProperty({ example: 200 })
  statusCode: number
}
