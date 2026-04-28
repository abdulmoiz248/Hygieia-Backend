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

export class MonthlyRoleTrendDto {
  @ApiProperty({
    example: '2026-03',
    description: 'Calendar month in YYYY-MM format',
  })
  month: string

  @ApiProperty({
    example: 'Mar 2026',
    description: 'Human-readable month label',
  })
  label: string

  @ApiProperty({
    example: 12,
    minimum: 0,
    description: 'Number of users created in that month for the role',
  })
  count: number
}

export class RoleTrendDto {
  @ApiProperty({
    example: 'doctor',
    description: 'User role from the database',
  })
  role: string

  @ApiProperty({
    example: 24,
    minimum: 0,
    description: 'Total number of users with this role',
  })
  total: number

  @ApiProperty({
    type: [MonthlyRoleTrendDto],
    description: 'Monthly counts for the previous 6 months',
  })
  monthlyTrends: MonthlyRoleTrendDto[]
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

  @ApiProperty({
    type: [RoleTrendDto],
    description: 'Role counts broken down by month for the previous 6 months',
  })
  roleTrends: RoleTrendDto[]
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
