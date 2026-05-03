import { Module } from '@nestjs/common';
import { BlogCategoryService } from './blog-category.service';
import { BlogCategoryController } from './blog-category.controller';
import { ClientsModule ,Transport} from '@nestjs/microservices';

@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'AUTH_SERVICE',
          transport: Transport.TCP,
          options: {
            host: process.env.AUTH_MS_HOST || 'localhost',
            port: process.env.AUTH_MS_PORT ? parseInt(process.env.AUTH_MS_PORT) : 4002,
          },
        },
      ]),
    ],
  controllers: [BlogCategoryController],
  providers: [BlogCategoryService],
})
export class BlogCategoryModule {}
