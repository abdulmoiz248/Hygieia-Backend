import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { firstValueFrom } from 'rxjs'
import { CreateLabTestDto, UpdateLabTestDto, DeleteLabTestDto } from './dto/lab-test.dto'

@ApiTags('Lab Tests')
@Controller('lab-tests')
export class LabTestsController {
  constructor(
    @Inject('LAB_TESTS_SERVICE') private readonly labTestsClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC ROUTES (no admin check)
  // ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get all lab tests',
    description: 'Returns all available lab tests sorted alphabetically. Public endpoint — no authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lab tests fetched successfully',
    schema: {
      example: [
        {
          id: 'uuid-123',
          name: 'Complete Blood Count (CBC)',
          description: 'Measures various blood components...',
          category: 'Hematology',
          price: 1500,
          duration: '24-48 hours',
          preparation_instructions: ['Fast for 8-12 hours'],
          unit: 'cells/mcL',
          optimal_range: '4,500-11,000',
          record_type: 'lab',
        },
      ],
    },
  })
  async findAll() {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'getAllLabTests' }, {}))
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a lab test by ID',
    description: 'Returns a single lab test by its UUID. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Lab test ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Lab test found' })
  @ApiResponse({ status: 404, description: 'Lab test not found' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'getLabTestById' }, id))
  }

  // ─────────────────────────────────────────────────────────────
  //  ADMIN-ONLY ROUTES
  // ─────────────────────────────────────────────────────────────

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Create a new lab test (Admin only)',
    description:
      'Creates a new lab test entry with name, category, price, duration, preparation instructions, unit, optimal range, and record type. Only admin users can create lab tests.',
  })
  @ApiBody({ type: CreateLabTestDto })
  @ApiResponse({
    status: 201,
    description: 'Lab test created successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Lab test created successfully',
        success: true,
        data: {
          id: 'uuid-123',
          name: 'Complete Blood Count (CBC)',
          category: 'Hematology',
          price: 1500,
          duration: '24-48 hours',
          preparation_instructions: ['Fast for 8-12 hours'],
          unit: 'cells/mcL',
          optimal_range: '4,500-11,000',
          record_type: 'lab',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — admin only' })
  @ApiResponse({ status: 400, description: 'Invalid payload or creation failed' })
  async create(@Body() dto: CreateLabTestDto) {
    try {
      await this.verifyAdmin(dto.userId)

      // Strip userId before sending to lab MS
      const { userId, ...labTestData } = dto
      const data = await firstValueFrom(
        this.labTestsClient.send({ cmd: 'createLabTest' }, labTestData),
      )
      return {
        statusCode: 201,
        message: 'Lab test created successfully',
        success: true,
        data,
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error
      throw new BadRequestException(error?.message || 'Failed to create lab test')
    }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Update a lab test (Admin only)',
    description:
      'Updates an existing lab test. You can update any combination of fields: name, description, category, price, duration, preparation_instructions, unit, optimal_range, record_type. Only admin users can update lab tests.',
  })
  @ApiParam({ name: 'id', description: 'Lab test ID (UUID)' })
  @ApiBody({ type: UpdateLabTestDto })
  @ApiResponse({
    status: 200,
    description: 'Lab test updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lab test updated successfully',
        success: true,
        data: {
          id: 'uuid-123',
          name: 'Complete Blood Count (CBC)',
          price: 2000,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — admin only' })
  @ApiResponse({ status: 400, description: 'Invalid payload or update failed' })
  @ApiResponse({ status: 404, description: 'Lab test not found' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLabTestDto,
  ) {
    try {
      await this.verifyAdmin(dto.userId)

      // Strip userId before sending to lab MS
      const { userId, ...updateData } = dto
      const data = await firstValueFrom(
        this.labTestsClient.send({ cmd: 'updateLabTest' }, { id, dto: updateData }),
      )
      return {
        statusCode: 200,
        message: 'Lab test updated successfully',
        success: true,
        data,
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error
      throw new BadRequestException(error?.message || 'Failed to update lab test')
    }
  }

  @Delete(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Delete a lab test (Admin only)',
    description:
      'Permanently deletes a lab test. Only admin users can delete lab tests. Pass the admin userId in the request body for authorization.',
  })
  @ApiParam({ name: 'id', description: 'Lab test ID (UUID)' })
  @ApiBody({ type: DeleteLabTestDto })
  @ApiResponse({
    status: 200,
    description: 'Lab test deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lab test deleted successfully',
        success: true,
        data: { success: true, deletedId: 'uuid-123' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — admin only' })
  @ApiResponse({ status: 404, description: 'Lab test not found' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeleteLabTestDto,
  ) {
    try {
      await this.verifyAdmin(dto.userId)

      const data = await firstValueFrom(
        this.labTestsClient.send({ cmd: 'deleteLabTest' }, id),
      )
      return {
        statusCode: 200,
        message: 'Lab test deleted successfully',
        success: true,
        data,
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error
      throw new BadRequestException(error?.message || 'Failed to delete lab test')
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  ADMIN VERIFICATION
  // ─────────────────────────────────────────────────────────────

  private async verifyAdmin(userId: string): Promise<void> {
    try {
      const userResult = await firstValueFrom(
        this.authClient.send({ cmd: 'user-data' }, { id: userId, role: 'admin' }),
      )
      if (!userResult?.data?.role || userResult.data.role !== 'admin') {
        throw new UnauthorizedException('Only admins can manage lab tests')
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Only admins can manage lab tests')
    }
  }
}
