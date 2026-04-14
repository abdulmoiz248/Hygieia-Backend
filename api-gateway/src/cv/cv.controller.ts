import { 
  Controller, Get, Post, Body, Param, Put, Delete, Inject, 
  UseInterceptors, UploadedFile 
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { FileInterceptor } from '@nestjs/platform-express'
import { firstValueFrom } from 'rxjs'
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('CV')
@Controller('cv')
export class CvController {
  constructor(@Inject('AUTH_SERVICE') private readonly cvClient: ClientProxy) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new CV submission',
    description: 'Submit a new CV with an optional uploaded file. The CV is stored with default status new.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CV details and optional file upload',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+2348012345678' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: { type: 'string', example: 'doctor' },
        doctorField: { type: 'string', example: 'Cardiology' },
        experience: { type: 'string', example: '5 years' },
        file: { type: 'string', format: 'binary', description: 'CV file upload' },
      },
      required: ['fullName', 'phone', 'email', 'role'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'CV submitted successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'CV submitted successfully',
        data: {
          id: 'uuid-string',
          fullName: 'John Doe',
          phone: '+2348012345678',
          email: 'john.doe@example.com',
          role: 'doctor',
          status: 'new',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid payload',
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: Express.Multer.File, @Body() dto: any) {
    // forward dto + file.buffer + file.mimetype
    return firstValueFrom(
      this.cvClient.send({ cmd: 'create_cv' }, { dto, file: { buffer: file?.buffer, mimetype: file?.mimetype } }),
    )
  }

  @Get()
  @ApiOperation({
    summary: 'Get all CV submissions',
    description: 'Fetch the list of all CV submissions and their statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'CV list retrieved successfully',
  })
  async findAll() {
    return firstValueFrom(this.cvClient.send({ cmd: 'find_all_cv' }, {}))
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a CV by ID',
    description: 'Fetch a single CV submission by its unique identifier.',
  })
  @ApiParam({ name: 'id', description: 'CV ID', example: 'uuid-string' })
  @ApiResponse({
    status: 200,
    description: 'CV retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'CV not found',
  })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(this.cvClient.send({ cmd: 'find_one_cv' }, id))
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a CV',
    description: 'Update CV details and optionally replace the uploaded file.',
  })
  @ApiParam({ name: 'id', description: 'CV ID', example: 'uuid-string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Updated CV fields and optional file upload',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+2348012345678' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: { type: 'string', example: 'doctor' },
        doctorField: { type: 'string', example: 'Neurology' },
        experience: { type: 'string', example: '7 years' },
        file: { type: 'string', format: 'binary', description: 'Replacement CV file upload' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CV updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'CV not found',
  })
  @UseInterceptors(FileInterceptor('file'))
  async update(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() dto: any) {
    return firstValueFrom(
      this.cvClient.send(
        { cmd: 'update_cv' },
        { id, dto, file: file ? { buffer: file.buffer, mimetype: file.mimetype } : null },
      ),
    )
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a CV',
    description: 'Remove a CV submission permanently by ID.',
  })
  @ApiParam({ name: 'id', description: 'CV ID', example: 'uuid-string' })
  @ApiResponse({
    status: 200,
    description: 'CV deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'CV not found',
  })
  async remove(@Param('id') id: string) {
    return firstValueFrom(this.cvClient.send({ cmd: 'remove_cv' }, id))
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update CV status',
    description: 'Update the CV review status. Shortlisted and rejected statuses trigger email notifications.',
  })
  @ApiParam({ name: 'id', description: 'CV ID', example: 'uuid-string' })
  @ApiBody({
    description: 'Status update payload',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['new', 'shortlisted', 'reviewed', 'rejected'],
          example: 'shortlisted',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CV status updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'CV status updated successfully',
        data: {
          id: 'uuid-string',
          status: 'shortlisted',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'CV not found',
  })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: 'new' | 'shortlisted' | 'reviewed' | 'rejected' }) {
    return firstValueFrom(this.cvClient.send({ cmd: 'update_cv_status' }, { id, status: dto.status }))
  }
}
