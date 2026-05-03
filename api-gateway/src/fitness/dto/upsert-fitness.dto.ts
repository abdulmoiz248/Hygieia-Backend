import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class FitnessUpdatesDto {
  @ApiPropertyOptional({ example: 8000, description: 'Number of steps taken' })
  @IsOptional()
  @IsNumber()
  steps?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Water intake in litres' })
  @IsOptional()
  @IsNumber()
  water?: number;

  @ApiPropertyOptional({ example: 7.5, description: 'Sleep duration in hours' })
  @IsOptional()
  @IsNumber()
  sleep?: number;

  @ApiPropertyOptional({ example: 350, description: 'Total calories burned' })
  @IsOptional()
  @IsNumber()
  calories_burned?: number;

  @ApiPropertyOptional({ example: 2100, description: 'Total calories consumed' })
  @IsOptional()
  @IsNumber()
  calories_intake?: number;

  @ApiPropertyOptional({ example: 60, description: 'Fat intake in grams' })
  @IsOptional()
  @IsNumber()
  fat?: number;

  @ApiPropertyOptional({ example: 120, description: 'Protein intake in grams' })
  @IsOptional()
  @IsNumber()
  protein?: number;

  @ApiPropertyOptional({ example: 250, description: 'Carbohydrate intake in grams' })
  @IsOptional()
  @IsNumber()
  carbs?: number;

  @ApiPropertyOptional({ example: 80, description: 'Calories burned from walking specifically' })
  @IsOptional()
  @IsNumber()
  walk_calories_burned?: number;
}

export class UpsertFitnessDto {
  @ApiProperty({ example: 'uuid-of-patient', description: 'Patient UUID' })
  @IsString()
  userId: string;

  @ApiProperty({ type: FitnessUpdatesDto, description: 'Fitness metrics to log/update for today' })
  updates: FitnessUpdatesDto;
}
