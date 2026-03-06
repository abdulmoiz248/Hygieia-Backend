import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BlogpostService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async featureBlogpost(blogpostId: string, userId: string) {
    return this.updateBlogpostFlag(blogpostId, userId, 'featured', true);
  }

  async unfeatureBlogpost(blogpostId: string, userId: string) {
    return this.updateBlogpostFlag(blogpostId, userId, 'featured', false);
  }

  async verifyBlogpost(blogpostId: string, userId: string) {
    return this.updateBlogpostFlag(blogpostId, userId, 'verified', true);
  }

  private async updateBlogpostFlag(
    blogpostId: string,
    userId: string,
    field: 'featured' | 'verified',
    value: boolean,
  ) {
    try {
      await this.verifyAdmin(userId);

      const { data: existingBlogpost, error: findError } = await this.supabaseService
        .getClient()
        .from('blogpost')
        .select('id')
        .eq('id', blogpostId)
        .single();

      if (findError || !existingBlogpost) {
        throw new NotFoundException(`Blogpost with ID ${blogpostId} not found`);
      }

      const { data, error } = await this.supabaseService
        .getClient()
        .from('blogpost')
        .update({ [field]: value })
        .eq('id', blogpostId)
        .select('*')
        .single();

      if (error || !data) {
        throw new InternalServerErrorException('Failed to update blogpost');
      }

      return data;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update blogpost');
    }
  }

  private async verifyAdmin(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new BadRequestException('User not found');
    }

    if (data.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
