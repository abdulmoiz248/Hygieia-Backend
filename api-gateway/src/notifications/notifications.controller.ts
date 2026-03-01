import { 
  Controller, 
  Get, 
  Inject, 
  Param, 
  Patch, 
  HttpStatus, 
  HttpException,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, timeout } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
 
  constructor(@Inject('AUTH_SERVICE') private readonly notifications: ClientProxy) {}

  @Get(':id')
  async getNutritionistNotifications(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('User ID parameter is required');
      }

      this.logger.log(`Fetching notifications for user: ${id}`);

      const result = await this.notifications
        .send({ cmd: 'get_notifications' }, id)
        .pipe(
          timeout(10000), // 10 second timeout
          catchError(error => {
            this.logger.error(`Microservice error: ${error.message}`);
            
            if (error instanceof TimeoutError) {
              return throwError(() => new InternalServerErrorException(
                'Request timeout: The notification service is taking too long to respond'
              ));
            }

            // Handle errors from the microservice
            if (error.message) {
              const errorMessage = error.message;
              
              if (errorMessage.includes('User ID is required') || 
                  errorMessage.includes('Invalid user ID format')) {
                return throwError(() => new BadRequestException(errorMessage));
              }
              
              if (errorMessage.includes('not found')) {
                return throwError(() => new NotFoundException(errorMessage));
              }
              
              return throwError(() => new InternalServerErrorException(errorMessage));
            }

            return throwError(() => new InternalServerErrorException(
              'Failed to communicate with notification service'
            ));
          })
        )
        .toPromise();

      return {
        success: true,
        data: result,
        message: 'Notifications fetched successfully'
      };
    } catch (error) {
      this.logger.error(`Error in getNutritionistNotifications: ${error.message}`);
      
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('An unexpected error occurred while fetching notifications');
    }
  }

  
  @Patch('mark-read/:id')
  async markAllAsRead(@Param('id') id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new BadRequestException('User ID parameter is required');
      }

      this.logger.log(`Marking all notifications as read for user: ${id}`);

      const result = await this.notifications
        .send({ cmd: 'mark_all_as_read' }, id)
        .pipe(
          timeout(10000), // 10 second timeout
          catchError(error => {
            this.logger.error(`Microservice error: ${error.message}`);
            
            if (error instanceof TimeoutError) {
              return throwError(() => new InternalServerErrorException(
                'Request timeout: The notification service is taking too long to respond'
              ));
            }

            // Handle errors from the microservice
            if (error.message) {
              const errorMessage = error.message;
              
              if (errorMessage.includes('User ID is required') || 
                  errorMessage.includes('Invalid user ID format')) {
                return throwError(() => new BadRequestException(errorMessage));
              }
              
              if (errorMessage.includes('not found')) {
                return throwError(() => new NotFoundException(errorMessage));
              }
              
              return throwError(() => new InternalServerErrorException(errorMessage));
            }

            return throwError(() => new InternalServerErrorException(
              'Failed to communicate with notification service'
            ));
          })
        )
        .toPromise();

      return {
        success: true,
        data: result,
        message: result.message || 'Notifications updated successfully'
      };
    } catch (error) {
      this.logger.error(`Error in markAllAsRead: ${error.message}`);
      
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('An unexpected error occurred while updating notifications');
    }
  }

}
