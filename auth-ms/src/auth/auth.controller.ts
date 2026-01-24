import { Body, Controller, Post, Get, Req, Res, UseGuards, UnauthorizedException, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import type {  Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { MessagePattern } from '@nestjs/microservices'
import { RegisterDto } from './dto/register.dto'
import { RegisterWorkerDto } from './dto/register-worker.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto'
import { createSuccessResponse, createErrorResponse } from './dto/api-response.dto'

@Controller()
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}
  
  

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res: Response) {
  const user = req.user
  console.log("o auth user=", user)

  const email = user.emails?.[0]?.value // 👈 extract email safely
  if (!email) {
    throw new Error('Google account has no email')
  }

  await this.auth.registerOAuth(email)

  const token = await this.auth.login(req.user)
  res.redirect(`${process.env.APP_URL}/?token=${token.accessToken}`)
}

  // === Fitbit OAuth Routes ===
  @Get('fitbit')
  async fitbitAuth(@Req() req, @Res() res: Response) {
    // Get the user's email from query parameter
    const userEmail = req.query.email as string
    
    if (!userEmail) {
      return res.redirect(`${process.env.APP_URL}?error=no_email`)
    }

    // Verify user exists
    const user = await this.auth.getUserByEmail(userEmail)
    if (!user) {
      return res.redirect(`${process.env.APP_URL}?error=user_not_found`)
    }

    // Build Fitbit OAuth URL with state parameter containing the user email
    const callbackUrl = process.env.FITBIT_CALLBACK_URL || 'http://localhost:4001/auth/fitbit/callback'
    const fitbitAuthUrl = `https://www.fitbit.com/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.FITBIT_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `scope=activity%20heartrate%20location%20nutrition%20profile%20settings%20sleep%20social%20weight&` +
      `state=${encodeURIComponent(userEmail)}`

    res.redirect(fitbitAuthUrl)
  }

  @Get('fitbit/callback')
  @UseGuards(AuthGuard('fitbit'))
  async fitbitCallback(@Req() req, @Res() res: Response) {
    const fitbitUser = req.user
    console.log("Fitbit OAuth user=", fitbitUser)

    // Extract the user's email from state parameter
    const userEmail = req.query.state as string

    if (!userEmail) {
      console.error('No email provided in Fitbit OAuth flow')
      return res.redirect(`${process.env.APP_URL}?error=authentication_failed`)
    }

    try {
      // Get user by email
      const user = await this.auth.getUserByEmail(userEmail)
      if (!user) {
        console.error('❌ User not found in database:', userEmail)
        return res.redirect(`${process.env.APP_URL}?error=user_not_found&message=Please signup first`)
      }

      const userId = user.id
      console.log('✅ User found, ID:', userId)

      // Save Fitbit tokens
      await this.auth.handleFitbitCallback(userId, fitbitUser)
      console.log('✅ Fitbit tokens saved successfully for user:', userId)
      res.redirect(`${process.env.APP_URL}?fitbit=connected`)
    } catch (error) {
      console.error('❌ Failed to save Fitbit tokens:', error)
      res.redirect(`${process.env.APP_URL}?error=fitbit_save_failed&message=Database error`)
    }
  }

  // === Microservice patterns ===
  @MessagePattern({ cmd: 'register' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async registerMs(data: RegisterDto) {
    try {
      const result = await this.auth.register(data.email, data.password)
      return createSuccessResponse(result.message, result, 201)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Registration failed', error.detail, 400)
    }
  }
  @MessagePattern({ cmd: 'register-worker' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async registerWorkerMs(data: RegisterWorkerDto) {
    try {
      const result = await this.auth.registerWorkers(data.name, data.role, data.personalEmail)
      return createSuccessResponse(result.message, result, 201)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Worker registration failed', error.detail, error.status || 400)
    }
  }
  @MessagePattern({ cmd: 'verify-otp' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyOtpMs(data: VerifyOtpDto) {
    try {
      const result = await this.auth.verifyOtp(data.email, data.otp)
      return createSuccessResponse(result.message, result, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'OTP verification failed', error.detail, error.status || 400)
    }
  }

  @MessagePattern({ cmd: 'login' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async loginMs(data: LoginDto) {
    try {
      const user = await this.auth.validateUser(data.email, data.password)
      const result = await this.auth.login(user)
      return createSuccessResponse(result.message, result, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Login failed', error.detail, error.status || 401)
    }
  }

  @MessagePattern({ cmd: 'request-password-reset' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async requestPasswordResetMs(data: RequestPasswordResetDto) {
    try {
      const result = await this.auth.requestPasswordReset(data.email)
      return createSuccessResponse(result.message, result, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Password reset request failed', error.detail, error.status || 400)
    }
  }

  @MessagePattern({ cmd: 'verify-reset-otp' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async VerifyResetOtp(data: VerifyOtpDto) {
    try {
      const result = await this.auth.verifyResetOtp(data.email, data.otp)
      return createSuccessResponse(result.message, result, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'OTP verification failed', error.detail, error.status || 400)
    }
  }

  @MessagePattern({ cmd: 'reset-password' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPasswordMs(data: ResetPasswordDto) {
    try {
      const result = await this.auth.resetPassword(data.email, data.otp, data.newPassword)
      return createSuccessResponse(result.message, result, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Password reset failed', error.detail, error.status || 400)
    }
  }

@MessagePattern({ cmd: 'user-data' })
async getUserData(payload: { id: string; role: string }) {
  try {
    const { id, role } = payload
    const result = await this.auth.getUserByRoleAndId(role, id)
    return createSuccessResponse('User profile fetched successfully', {...result}, 200)
  } catch (error: any) {
    return createErrorResponse(error.message || 'Failed to fetch user data', error.detail, error.status || 400)
  }
}


@MessagePattern({ cmd: 'upload-user-photo' })
async uploadUserPhoto(payload: { role: string; userId: string; fileBuffer: Buffer }) {
  try {
    const { role, userId, fileBuffer } = payload
    const result = await this.auth.upsertUserProfilePhoto(role, userId, fileBuffer)
    return createSuccessResponse('Profile photo updated successfully', result, 200)
  } catch (error: any) {
    return createErrorResponse(error.message || 'Failed to upload profile photo', error.detail, error.status || 400)
  }
}


@MessagePattern({ cmd: 'upsert-user-profile' })
async upsertUserProfile(payload: { role: string; profileData: Record<string, any> }) {
  try {
    const { role, profileData } = payload
    const result = await this.auth.upsertUserProfileByRole(role, profileData.profileData)
    return createSuccessResponse('Profile upserted successfully', result, 200)
  } catch (error: any) {
    return createErrorResponse(error.message || 'Failed to upsert user profile', error.detail, error.status || 400)
  }
}




  @MessagePattern({ cmd: 'me' })
  async meMs(token: string) {
    try {
      if (!token) {
        throw new UnauthorizedException('Token is required')
      }
      const decoded = await this.jwt.verify(token)
      return createSuccessResponse('Token verified successfully', decoded, 200)
    } catch (error: any) {
      return createErrorResponse(error.message || 'Invalid token', error.detail, 401)
    }
  }
}
