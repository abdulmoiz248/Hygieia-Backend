import { ApiProperty } from '@nestjs/swagger';

export class BlogpostAdminActionDto {
  @ApiProperty({
    description: 'Admin user ID performing the action',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;
}
