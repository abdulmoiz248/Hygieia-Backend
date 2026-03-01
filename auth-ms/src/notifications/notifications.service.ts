import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly supabase: SupabaseClient
    
  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )
  }

  /**
   * Validates if the provided userId is valid
   */
  private validateUserId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('User ID is required and cannot be empty');
    }

    // Validate UUID format (Supabase typically uses UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid user ID format. Expected a valid UUID');
    }
  }

  /**
   * Checks if a user exists in the database
   */
  private async checkUserExists(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error checking user existence: ${error.message}`);
      throw new InternalServerErrorException('Failed to verify user existence');
    }
  }

  async getNotifications(userId: string) {
    try {
      // Validate input
      this.validateUserId(userId);

      // Check if user exists
      await this.checkUserExists(userId);

      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error(`Database error fetching notifications: ${error.message}`);
        throw new InternalServerErrorException('Failed to fetch notifications. Please try again later');
      }

      if (!data || data.length === 0) {
        this.logger.log(`No notifications found for user: ${userId}`);
        return [];
      }

      this.logger.log(`Fetched ${data.length} notification(s) for user: ${userId}`);
      return data;
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Unexpected error in getNotifications: ${error.message}`);
      throw new InternalServerErrorException('An unexpected error occurred while fetching notifications');
    }
  }

  async markAllAsRead(userId: string) {
    try {
      // Validate input
      this.validateUserId(userId);

      // Check if user exists
      await this.checkUserExists(userId);

      // Check if there are any unread notifications
      const { data: unreadNotifications, error: checkError } = await this.supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);

      if (checkError) {
        this.logger.error(`Database error checking unread notifications: ${checkError.message}`);
        throw new InternalServerErrorException('Failed to check notifications status');
      }

      if (!unreadNotifications || unreadNotifications.length === 0) {
        return { 
          message: 'No unread notifications to mark as read',
          updatedCount: 0 
        };
      }

      const { data, error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        this.logger.error(`Database error updating notifications: ${error.message}`);
        throw new InternalServerErrorException('Failed to mark notifications as read. Please try again later');
      }

      const updatedCount = data?.length || 0;
      this.logger.log(`Marked ${updatedCount} notification(s) as read for user: ${userId}`);

      return { 
        message: `Successfully marked ${updatedCount} notification(s) as read`,
        updatedCount 
      };
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Unexpected error in markAllAsRead: ${error.message}`);
      throw new InternalServerErrorException('An unexpected error occurred while updating notifications');
    }
  }


}
