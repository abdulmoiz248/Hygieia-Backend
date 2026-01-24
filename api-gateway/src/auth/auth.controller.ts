import { 
  Body, 
  Controller, 
  Get, 
  Inject, 
  Post, 
  Req, 
  BadRequestException, 
  UnauthorizedException, 
  Query,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { firstValueFrom } from 'rxjs'

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private authClient: ClientProxy) {}



  
  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register' }, body))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'register failed')
    }
  }

  @Post('register-worker')
  async registerWorker(@Body() body: { name: string; role: string; personalEmail: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register-worker' }, body))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Worker registration failed')
    }
  }


   
@Get('user')
async getUser(@Query('id') id: string, @Query('role') role: string) {
  try {
    role=role=='pathologist'?"lab-technician":role;
    console.log("Query params:", { id, role })

    return await firstValueFrom(
      this.authClient.send({ cmd: 'user-data' }, { id, role })
    )
  } catch (e: any) {
    throw new BadRequestException(e?.message || 'Failed to fetch user')
  }
}


@Post('user')
async upsertUser(
  @Query('role') role: string,
  @Body() profileData: Record<string, any>
) {
  try {
    return await firstValueFrom(
      this.authClient.send(
        { cmd: 'upsert-user-profile' },
        { role, profileData }
      )
    )
  } catch (e: any) {
    throw new BadRequestException(e?.message || 'Failed to upsert user profile')
  }
}



@Post('/profile-pic')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
async uploadUserPhoto(
  @Query('role') role: string,
  @Query('userId') userId: string,
  @UploadedFile() file: Express.Multer.File
) {
  if (!file) {
    console.log("no file")
    throw new BadRequestException('File is required');
  }

  console.log(file); // should now log the file with buffer
  return await firstValueFrom(
    this.authClient.send(
      { cmd: 'upload-user-photo' },
      { role, userId, fileBuffer: file.buffer }
    )
  );
}



  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'verify-otp' }, body))
    } catch (e: any) {
      console.log(e)
      throw new BadRequestException(e?.message || 'otp verification failed')
    }
  }


  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'login' }, body))
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'invalid credentials')
    }
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'request-password-reset' }, body))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'request password reset failed')
    }
  }


  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() body: { email: string; otp: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'verify-reset-otp' }, body))
    } catch (e: any) {
      console.log(e)
      throw new BadRequestException(e?.message || 'verify reset otp failed')
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'reset-password' }, body))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'reset password failed')
    }
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new UnauthorizedException('missing token')
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'me' }, token))
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'invalid token')
    }
  }
}
