import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BlogpostService } from './blogpost.service';
import { UpdateBlogpostStatusDto } from './dto/update-blogpost-status.dto';

@Controller('blogpost')
export class BlogpostController {
  constructor(private readonly blogpostService: BlogpostService) {}

  @MessagePattern({ cmd: 'feature_blogpost' })
  async featureBlogpost(payload: UpdateBlogpostStatusDto) {
    if (!payload?.blogpostId) {
      throw new BadRequestException('Blogpost ID is required');
    }

    if (!payload?.userId) {
      throw new BadRequestException('User ID is required');
    }

    const blogpost = await this.blogpostService.featureBlogpost(
      payload.blogpostId,
      payload.userId,
    );

    return {
      data: blogpost,
      message: 'Blogpost featured successfully',
    };
  }

  @MessagePattern({ cmd: 'unfeature_blogpost' })
  async unfeatureBlogpost(payload: UpdateBlogpostStatusDto) {
    if (!payload?.blogpostId) {
      throw new BadRequestException('Blogpost ID is required');
    }

    if (!payload?.userId) {
      throw new BadRequestException('User ID is required');
    }

    const blogpost = await this.blogpostService.unfeatureBlogpost(
      payload.blogpostId,
      payload.userId,
    );

    return {
      data: blogpost,
      message: 'Blogpost unfeatured successfully',
    };
  }

  @MessagePattern({ cmd: 'verify_blogpost' })
  async verifyBlogpost(payload: UpdateBlogpostStatusDto) {
    if (!payload?.blogpostId) {
      throw new BadRequestException('Blogpost ID is required');
    }

    if (!payload?.userId) {
      throw new BadRequestException('User ID is required');
    }

    const blogpost = await this.blogpostService.verifyBlogpost(
      payload.blogpostId,
      payload.userId,
    );

    return {
      data: blogpost,
      message: 'Blogpost verified successfully',
    };
  }
}
