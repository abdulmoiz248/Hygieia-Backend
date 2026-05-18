import { Controller, Post, Get, Body, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FeedbackFormService } from './feedback-form.service';
import { CreateFeedbackFormDto } from './dto/create-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { AdminActionDto } from './dto/admin-action.dto';

@ApiTags('Feedback Forms')
@Controller('feedback-forms')
export class FeedbackFormController {
  constructor(private readonly feedbackFormService: FeedbackFormService) { }

  @Post('admin/create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Create a new feedback form and send to patients (Admin Only)' })
  @ApiBody({ type: CreateFeedbackFormDto })
  createForm(@Body() createDto: CreateFeedbackFormDto) {
    return this.feedbackFormService.createForm(createDto, createDto.userId);
  }

  @Post('admin/list')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Get all feedback forms (Admin Only)' })
  @ApiBody({ type: AdminActionDto })
  getAllForms(@Body() dto: AdminActionDto) {
    return this.feedbackFormService.getAllForms(dto.userId);
  }

  @Post('admin/:id/results')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Get results for a specific feedback form (Admin Only)' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiBody({ type: AdminActionDto })
  getFormResults(@Param('id') formId: string, @Body() dto: AdminActionDto) {
    return this.feedbackFormService.getFormResults(formId, dto.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a feedback form by ID for filling out (Public)' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  getFormById(@Param('id') formId: string) {
    return this.feedbackFormService.getFormById(formId);
  }

  @Post(':id/submit')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Submit answers for a feedback form (Public)' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiBody({ type: SubmitFeedbackDto })
  submitForm(@Param('id') formId: string, @Body() submitDto: SubmitFeedbackDto) {
    return this.feedbackFormService.submitForm(formId, submitDto);
  }
}
