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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiConsumes } from '@nestjs/swagger'
import { RegisterDto } from './dto/register.dto'
import { RegisterWorkerDto } from './dto/register-worker.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ResendOtpDto } from './dto/resend-otp.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto'
import { DeleteWorkerDto } from './dto/delete-worker.dto'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private authClient: ClientProxy) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register new patient user',
    description: 'Register a new patient account with email and password. An OTP will be sent for email verification.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully. OTP sent to email.',
    schema: {
      example: {
        statusCode: 201,
        message: 'Registered successfully. OTP sent to your email',
        data: { success: true },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation errors or email already exists',
    schema: {
      example: {
        statusCode: 400,
        message: 'This email is already registered and verified',
        success: false
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register' }, registerDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'register failed')
    }
  }

  @Post('register-worker')
  @ApiOperation({ 
    summary: 'Register healthcare worker',
    description: 'Register a new healthcare worker (doctor, nutritionist, or lab technician). Credentials will be sent to personal email.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Worker registered successfully. Credentials sent to personal email.',
    schema: {
      example: {
        statusCode: 201,
        message: 'Worker registered successfully. Credentials sent to personal email.',
        data: {
          message: 'Worker registered successfully. Credentials sent to personal email.',
          success: true,
          email: 'drsarahjohnson@hygieia.com',
          id: 'uuid-string'
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation errors',
    schema: {
      example: {
        statusCode: 400,
        message: 'Name is required',
        success: false
      }
    }
  })
  async registerWorker(@Body() registerWorkerDto: RegisterWorkerDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register-worker' }, registerWorkerDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Worker registration failed')
    }
  }

  @Post('delete-worker')
  @ApiOperation({
    summary: 'Delete healthcare worker',
    description: 'Delete a healthcare worker account by work email. A thank-you email will be sent to the worker personal email.'
  })
  @ApiResponse({
    status: 200,
    description: 'Worker deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Worker deleted successfully and thank-you email sent to personal email',
        data: {
          success: true,
          email: 'drsarahjohnson@hygieia.com',
          role: 'doctor',
          personalEmail: 'sarah.johnson@gmail.com'
        },
        success: true
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - worker not found or invalid email'
  })
  async deleteWorker(@Body() deleteWorkerDto: DeleteWorkerDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'delete-worker' }, deleteWorkerDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Worker deletion failed')
    }
  }


  @Get('user')
  @ApiOperation({ 
    summary: 'Get user profile',
    description: 'Retrieve user profile information by ID and role.'
  })
  @ApiQuery({ name: 'id', description: 'User ID', required: true })
  @ApiQuery({ name: 'role', description: 'User role', required: true, enum: ['patient', 'doctor', 'nutritionist', 'lab-technician', 'pathologist', 'admin'] })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'User profile fetched successfully',
        data: {
          id: 'user-uuid',
          email: 'user@example.com',
          role: 'patient',
          name: 'John Doe',
          success: true
        },
        success: true
      }
    }
  })
  async getUser(@Query('id') id: string, @Query('role') role: string) {
    try {
      role = role == 'pathologist' ? 'lab-technician' : role;
      console.log('Query params:', { id, role })

      return await firstValueFrom(
        this.authClient.send({ cmd: 'user-data' }, { id, role })
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to fetch user')
    }
  }

  @Post('user')
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Create or update user profile information.'
  })
  @ApiQuery({ name: 'role', description: 'User role', required: true, enum: ['patient', 'doctor', 'nutritionist', 'lab-technician', 'admin'] })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Profile upserted successfully',
        data: { success: true },
        success: true
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Upload user profile picture',
    description: 'Upload and update user profile picture.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile picture file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, etc.)'
        }
      }
    }
  })
  @ApiQuery({ name: 'role', description: 'User role', required: true, enum: ['patient', 'doctor', 'nutritionist', 'lab-technician', 'admin'] })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile picture updated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Profile photo updated successfully',
        data: {
          img: 'https://cloudinary-url.com/image.jpg',
          success: true
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - file is required',
    schema: {
      example: {
        statusCode: 400,
        message: 'File is required',
        success: false
      }
    }
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadUserPhoto(
    @Query('role') role: string,
    @Query('userId') userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      console.log('no file')
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
  @ApiOperation({ 
    summary: 'Verify email OTP',
    description: 'Verify the OTP sent to email during registration to complete account activation.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verified successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Email verified successfully',
        data: { success: true },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - invalid OTP or email',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid or expired OTP',
        success: false
      }
    }
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'verify-otp' }, verifyOtpDto))
    } catch (e: any) {
      console.log(e)
      throw new BadRequestException(e?.message || 'otp verification failed')
    }
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description: 'Resend a new OTP to the user email and update the stored OTP in the users table.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP resent successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'OTP resent successfully',
        data: { success: true },
        success: true,
      },
    },
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'resend-otp' }, resendOtpDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'resend otp failed')
    }
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user with email and password to get access token.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        statusCode: 200,
        message: 'Login successful',
        data: {
          accessToken: 'jwt-token-string',
          role: 'patient',
          id: 'user-uuid',
          email: 'user@example.com',
          success: true
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid credentials or unverified email',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        success: false
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'login' }, loginDto))
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'invalid credentials')
    }
  }

  @Post('request-password-reset')
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset OTP to user email address.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset OTP sent successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Password reset OTP sent to your email',
        data: { success: true },
        success: true
      }
    }
  })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'request-password-reset' }, requestPasswordResetDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'request password reset failed')
    }
  }


  @Post('verify-reset-otp')
  @ApiOperation({ 
    summary: 'Verify password reset OTP',
    description: 'Verify the OTP sent for password reset.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'OTP verified successfully',
        data: { success: true },
        success: true
      }
    }
  })
  async verifyResetOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'verify-reset-otp' }, verifyOtpDto))
    } catch (e: any) {
      console.log(e)
      throw new BadRequestException(e?.message || 'verify reset otp failed')
    }
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Reset password with OTP',
    description: 'Reset user password using OTP received via email.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Password reset successfully',
        data: { success: true },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - invalid OTP or validation errors',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid or expired OTP',
        success: false
      }
    }
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'reset-password' }, resetPasswordDto))
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'reset password failed')
    }
  }

  @Get('me')
  @ApiOperation({ 
    summary: 'Get current user info',
    description: 'Verify JWT token and get current user information.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token verified successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Token verified successfully',
        data: {
          sub: 'user-uuid',
          email: 'user@example.com',
          role: 'patient',
          iat: 1640995200,
          exp: 1640998800
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - missing or invalid token',
    schema: {
      example: {
        statusCode: 401,
        message: 'missing token',
        success: false
      }
    }
  })
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
