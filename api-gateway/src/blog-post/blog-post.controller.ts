// api-gateway/blogPost.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'
import { firstValueFrom } from 'rxjs'
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { BlogpostAdminActionDto } from './dto/blogpost-admin-action.dto'

@ApiTags('Blog Posts')
@Controller('blogPost')
export class BlogPostController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create blog post' })
  @ApiResponse({ status: 201, description: 'Blog post created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @UseInterceptors(FileInterceptor('image'))
  async create(@Body() dto: CreateBlogPostDto, @UploadedFile() file?: Express.Multer.File) {
    try {
      return await firstValueFrom(
        this.authClient.send(
          { cmd: 'createBlogPost' },
          { ...dto, image: file ? file.buffer.toString('base64') : null },
        ),
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create blog post')
    }
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get blog posts by doctor' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiResponse({ status: 200, description: 'Blog posts retrieved successfully' })
  async findByDoctor(@Param('doctorId') doctorId: string) {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'findByDoctor' }, doctorId),
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to fetch blog posts')
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all blog posts' })
  @ApiResponse({ status: 200, description: 'Blog posts retrieved successfully' })
  async findAll() {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'findAllBlogPosts' }, {}),
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to fetch blog posts')
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blog post by ID' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved successfully' })
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'findOneBlogPost' }, id))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to fetch blog post')
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send(
          { cmd: 'updateBlogPost' },
          { id, dto: { ...dto, image: file ? file.buffer.toString('base64') : null } },
        ),
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to update blog post')
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post deleted successfully' })
  async remove(@Param('id') id: string) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'removeBlogPost' }, id))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to delete blog post')
    }
  }

  @Post(':id/feature')
  @ApiOperation({
    summary: 'Feature blog post (Admin only)',
    description:
      'Mark a blog post as featured. Requires admin userId in the request body and is validated by admin microservice.',
  })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiBody({ type: BlogpostAdminActionDto })
  @ApiResponse({ status: 201, description: 'Blogpost featured successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can perform this action' })
  @ApiResponse({ status: 400, description: 'Invalid request payload or blogpost not found' })
  async featureBlogpost(
    @Param('id') id: string,
    @Body() body: BlogpostAdminActionDto,
  ) {
    try {
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'feature_blogpost' },
          { blogpostId: id, userId: body.userId },
        ),
      )
    } catch (e: any) {
      if (e?.message?.includes('Only admins can perform this action')) {
        throw new ForbiddenException('Only admins can perform this action')
      }
      throw new BadRequestException(e?.message || 'Failed to feature blogpost')
    }
  }

  @Post(':id/unfeature')
  @ApiOperation({
    summary: 'Unfeature blog post (Admin only)',
    description:
      'Remove featured status from a blog post. Requires admin userId in the request body and is validated by admin microservice.',
  })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiBody({ type: BlogpostAdminActionDto })
  @ApiResponse({ status: 201, description: 'Blogpost unfeatured successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can perform this action' })
  @ApiResponse({ status: 400, description: 'Invalid request payload or blogpost not found' })
  async unfeatureBlogpost(
    @Param('id') id: string,
    @Body() body: BlogpostAdminActionDto,
  ) {
    try {
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'unfeature_blogpost' },
          { blogpostId: id, userId: body.userId },
        ),
      )
    } catch (e: any) {
      if (e?.message?.includes('Only admins can perform this action')) {
        throw new ForbiddenException('Only admins can perform this action')
      }
      throw new BadRequestException(e?.message || 'Failed to unfeature blogpost')
    }
  }

  @Post(':id/verify')
  @ApiOperation({
    summary: 'Verify blog post (Admin only)',
    description:
      'Mark a blog post as verified. Requires admin userId in the request body and is validated by admin microservice.',
  })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiBody({ type: BlogpostAdminActionDto })
  @ApiResponse({ status: 201, description: 'Blogpost verified successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can perform this action' })
  @ApiResponse({ status: 400, description: 'Invalid request payload or blogpost not found' })
  async verifyBlogpost(
    @Param('id') id: string,
    @Body() body: BlogpostAdminActionDto,
  ) {
    try {
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'verify_blogpost' },
          { blogpostId: id, userId: body.userId },
        ),
      )
    } catch (e: any) {
      if (e?.message?.includes('Only admins can perform this action')) {
        throw new ForbiddenException('Only admins can perform this action')
      }
      throw new BadRequestException(e?.message || 'Failed to verify blogpost')
    }
  }
}
