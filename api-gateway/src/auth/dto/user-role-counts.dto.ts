import { ApiProperty } from '@nestjs/swagger'

export class RoleCountDto {
  @ApiProperty({
    example: 'patient',
    description: 'User role from the database',
  })
  role: string

  @ApiProperty({
    example: 124,
    minimum: 0,
    description: 'Total number of users with this role',
  })
  count: number
}

export class UserRoleCountsDataDto {
  @ApiProperty({
    example: 241,
    minimum: 0,
    description: 'Total number of users across all roles',
  })
  totalUsers: number

  @ApiProperty({
    type: [RoleCountDto],
    description: 'Counts grouped by role',
  })
  roleCounts: RoleCountDto[]
}

export class UserRoleCountsResponseDto {
  @ApiProperty({ example: true })
  success: boolean

  @ApiProperty({ example: 'User role counts fetched successfully' })
  message: string

  @ApiProperty({ type: UserRoleCountsDataDto })
  data: UserRoleCountsDataDto

  @ApiProperty({ example: 200 })
  statusCode: number
}
