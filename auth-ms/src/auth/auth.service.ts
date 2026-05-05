import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { ClientProxy } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { InjectModel } from '@nestjs/mongoose'
import { Profile, ProfileDocument } from 'src/schema/patient.profile.schema'
import { Model } from 'mongoose'
import { NutritionistProfile, NutritionistProfileDocument } from 'src/schema/nutritionist-profile.schema'
import { DoctorProfile, DoctorProfileDocument } from 'src/schema/doctor-profile.schema'
import { FitbitService } from '../fitbit/fitbit.service'

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
    @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
    private configService: ConfigService,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(NutritionistProfile.name) private nutModel:Model<NutritionistProfileDocument>,
    @InjectModel(DoctorProfile.name) private doctorModel: Model<DoctorProfileDocument>,
    private fitbitService: FitbitService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
  }

  private async sendOtpEmail(email: string, otp: string, isPasswordReset: boolean = false) {
    console.log(`[INFO: AUTH SERVICE] Sending OTP email to ${email}`)
    const event = isPasswordReset ? 'send-password-reset-otp-email' : 'send-otp-verification-email'
    this.mailerClient.emit(event, { email, otp })
  }

  private async sendPasswordResetOtpEmails(workEmail: string, otp: string, personalEmail?: string | null) {
    await this.sendOtpEmail(workEmail, otp, true)

    if (personalEmail && personalEmail !== workEmail) {
      await this.sendOtpEmail(personalEmail, otp, true)
    }
  }

  private async sendCredentialsEmail(personalEmail: string, workEmail: string, password: string, name: string, role: string) {
    console.log(`[INFO: AUTH SERVICE] Sending credentials email to ${personalEmail}`)
    this.mailerClient.emit('send-worker-credentials-email', { 
      personalEmail, 
      workEmail, 
      password, 
      name, 
      role 
    })
  }

  private async sendWorkerDeletionEmail(personalEmail: string, workEmail: string, name: string, role: string) {
    console.log(`[INFO: AUTH SERVICE] Sending worker deletion email to ${personalEmail}`)
    this.mailerClient.emit('send-worker-goodbye-email', {
      personalEmail,
      workEmail,
      name,
      role,
    })
  }

  async verifyResetOtp(email: string, otp: string) {
    console.log(`[INFO: AUTH SERVICE] Verifying reset OTP for ${email}`)
    
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      throw new BadRequestException('OTP must be a 6-digit number')
    }

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      console.error(`[INFO: AUTH SERVICE] Invalid email for reset OTP: ${email}`)
      throw new UnauthorizedException('Email not found in our system')
    }
    if (data.otp !== otp) {
      console.error(`[INFO: AUTH SERVICE] Invalid OTP for ${email}`)
      throw new BadRequestException('Invalid or expired OTP')
    }

    console.log(`[INFO: AUTH SERVICE] OTP verified successfully for ${email}`)
    return { success: true, message: 'OTP verified successfully' }
  }

  async registerWorkers(name: string, role: string, personalEmail: string) {
    console.log(`[INFO: AUTH SERVICE] Registering new worker with name: ${name} and role: ${role}`)
    
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Name is required')
    }
    if (!role || !['doctor', 'nutritionist', 'lab-technician'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be doctor, nutritionist, or lab-technician')
    }
    if (!this.isValidEmail(personalEmail)) {
      throw new BadRequestException('Valid personal email is required')
    }

    // Generate email from name
    let baseEmail = name.toLowerCase().replace(/\s+/g, '') + '@hygieia.com'
    let email = baseEmail
    let counter = 1

    // Check for email duplicates and increment if needed
    while (true) {
      const { data: existingUser } = await this.supabase.getClient()
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (!existingUser) break
      
      email = name.toLowerCase().replace(/\s+/g, '') + counter + '@hygieia.com'
      counter++
    }

    // Generate random password
    const password = crypto.randomBytes(8).toString('hex') + 'A1'
    const hash = await bcrypt.hash(password, 10)

    // Create user in users table
    const { data: userData, error: userError } = await this.supabase.getClient()
      .from('users')
      .insert([{ email, password_hash: hash, role, personal_email: personalEmail, is_verified: true }])
      .select()
      .single()

    if (userError) {
      console.error(`[INFO: AUTH SERVICE] Worker registration error: ${userError.message}`)
      throw new BadRequestException('Failed to register worker. Please try again later')
    }

    // Create profile based on role
    let profileData
    if (role === 'doctor') {
      profileData = {
        id: userData.id,
        name,
        phone: '',
        gender: '',
        dateofbirth: '',
        img: '',
        personal_email: personalEmail,
        specialization: 'General Medicine',
        experienceYears: 0,
        certifications: [],
        education: [],
        languages: ['English'],
        bio: '',
        consultationFee: 0,
        workingHours: [],
        rating: 0
      }
      
      const newDoctor = new this.doctorModel(profileData)
      await newDoctor.save()
    } else if (role === 'nutritionist') {
      profileData = {
        id: userData.id,
        name,
        phone: '',
        gender: '',
        dateofbirth: '',
        img: '',
        personal_email: personalEmail,
        specialization: 'General Nutrition',
        experienceYears: 0,
        certifications: [],
        education: [],
        languages: ['English'],
        bio: '',
        consultationFee: 0,
        workingHours: [],
        rating: 0
      }
      
      const newNutritionist = new this.nutModel(profileData)
      await newNutritionist.save()
    } else if (role === 'lab-technician') {
      // Create lab technician profile in Supabase
      const labProfileData = {
        id: userData.id,
        name,
        phone: '',
        gender: '',
        dateofbirth: '',
        img: ''
      }
      
      const { error: labError } = await this.supabase.getClient()
        .from('lab_technician_profiles')
        .insert([labProfileData])
      
      if (labError) {
        console.error(`[INFO: AUTH SERVICE] Lab technician profile creation error: ${labError.message}`)
        // Continue anyway, profile can be created later
      }
    }

    // Send credentials to personal email
    await this.sendCredentialsEmail(personalEmail, email, password, name, role)

    console.log(`[INFO: AUTH SERVICE] Worker registered successfully: ${email}`)
    return { 
      message: 'Worker registered successfully. Credentials sent to personal email.', 
      success: true,
      email,
      id: userData.id
    }
  }

  async deleteWorker(email: string) {
    console.log(`[INFO: AUTH SERVICE] Deleting worker with email: ${email}`)

    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }

    const client = this.supabase.getClient()
    const { data: user, error: userFetchError } = await client
      .from('users')
      .select('id, email, role, personal_email')
      .eq('email', email)
      .single()

    if (userFetchError || !user) {
      console.error(`[INFO: AUTH SERVICE] Worker not found for email: ${email}`)
      throw new BadRequestException('Worker not found')
    }

    if (!['doctor', 'nutritionist', 'lab-technician'].includes(user.role)) {
      throw new BadRequestException('Provided email does not belong to a worker account')
    }

    let workerName = user.email
    let personalEmail = user.personal_email || ''

    if (user.role === 'doctor') {
      const doctorProfile = await this.doctorModel.findOne({ id: user.id }).lean().exec()
      if (doctorProfile?.name) workerName = doctorProfile.name
      if (doctorProfile?.personal_email) personalEmail = doctorProfile.personal_email
      await this.doctorModel.deleteOne({ id: user.id }).exec()
    } else if (user.role === 'nutritionist') {
      const nutritionistProfile = await this.nutModel.findOne({ id: user.id }).lean().exec()
      if (nutritionistProfile?.name) workerName = nutritionistProfile.name
      if (nutritionistProfile?.personal_email) personalEmail = nutritionistProfile.personal_email
      await this.nutModel.deleteOne({ id: user.id }).exec()
    } else {
      const { data: labProfile } = await client
        .from('lab_technician_profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      if (labProfile?.name) workerName = labProfile.name

      const { error: labDeleteError } = await client
        .from('lab_technician_profiles')
        .delete()
        .eq('id', user.id)

      if (labDeleteError) {
        console.error(`[INFO: AUTH SERVICE] Failed to delete lab technician profile for ${email}: ${labDeleteError.message}`)
        throw new BadRequestException('Failed to delete worker profile')
      }
    }

    const { error: userDeleteError } = await client
      .from('users')
      .delete()
      .eq('id', user.id)

    if (userDeleteError) {
      console.error(`[INFO: AUTH SERVICE] Failed to delete worker user for ${email}: ${userDeleteError.message}`)
      throw new BadRequestException('Failed to delete worker user account')
    }

    if (personalEmail && this.isValidEmail(personalEmail)) {
      await this.sendWorkerDeletionEmail(personalEmail, user.email, workerName, user.role)
    } else {
      console.error(`[INFO: AUTH SERVICE] Missing personal email for deleted worker ${email}, skipping goodbye email`)
    }

    console.log(`[INFO: AUTH SERVICE] Worker deleted successfully: ${email}`)
    return {
      success: true,
      message: 'Worker deleted successfully and thank-you email sent to personal email',
      email: user.email,
      role: user.role,
      personalEmail,
    }
  }

  async register(email: string, password: string) {
    console.log(`[INFO: AUTH SERVICE] Registering new user with email: ${email}`)
    
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }
    
    // Validate password
    if (!this.isValidPassword(password)) {
      throw new BadRequestException('Password must be at least 8 characters and contain uppercase, lowercase, and numbers')
    }

    const hash = await bcrypt.hash(password, 10)
    const otp = crypto.randomInt(100000, 999999).toString()

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .insert([{ email, password_hash: hash, role: 'patient', otp, is_verified: false }])
      .select()

    if (error) {
      console.error(`[INFO: AUTH SERVICE] Registration error for ${email}: ${error.message}`)
      if (error.code === '23505') {
        // Email already exists - check if user is verified
        const { data: existingUser } = await this.supabase.getClient()
          .from('users')
          .select('is_verified')
          .eq('email', email)
          .single()

        if (existingUser && !existingUser.is_verified) {
          // User exists but not verified - update password and resend OTP
          console.log(`[INFO: AUTH SERVICE] User exists but not verified, resending OTP to ${email}`)
          await this.supabase.getClient()
            .from('users')
            .update({ password_hash: hash, otp })
            .eq('email', email)

          await this.sendOtpEmail(email, otp, false)
          return { message: 'Account not verified yet. New OTP sent to email', success: true }
        }

        throw new ConflictException('This email is already registered and verified')
      }
      throw new BadRequestException('Failed to register user. Please try again later')
    }

    await this.sendOtpEmail(email, otp, false)
    
    // Create initial patient profile with mock data
    const patientProfileData = {
      id: data[0].id,
      name: '',
      phone: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      bloodType: '',
      allergies: '',
      conditions: '',
      medications: '',
      avatar: '',
      gender: '',
      weight: 0,
      height: 0,
      vaccines: '',
      ongoingMedications: '',
      surgeryHistory: '',
      implants: '',
      pregnancyStatus: '',
      menstrualCycle: '',
      mentalHealth: '',
      familyHistory: '',
      organDonor: '',
      disabilities: '',
      lifestyle: '',
      healthscore: 0,
      adherence: '',
      missed_doses: '',
      doses_taken: '',
      limit: {}
    }
    
    const newPatient = new this.profileModel(patientProfileData)
    await newPatient.save()
    
    return { message: 'Registered successfully. OTP sent to your email', success: true }
  }

  async registerOAuth(email: string) {
    console.log(`[INFO: AUTH SERVICE] Registering OAuth user with email: ${email}`)
    const { data: existingUser, error: fetchError } = await this.supabase.getClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`[INFO: AUTH SERVICE] OAuth fetch error: ${fetchError.message}`)
      throw new Error(fetchError.message)
    }

    if (existingUser) {
      console.log(`[INFO: AUTH SERVICE] OAuth user already exists: ${email}`)
      return { message: 'User already exists', success: false }
    }

    const { error: insertError } = await this.supabase.getClient()
      .from('users')
      .insert([{ email, password_hash: '', role: 'patient', otp: 0, is_verified: true }])

    if (insertError) {
      console.error(`[INFO: AUTH SERVICE] OAuth registration error: ${insertError.message}`)
      throw new Error(insertError.message)
    }

    console.log(`[INFO: AUTH SERVICE] OAuth user registered successfully: ${email}`)
    return { message: 'Registered successfully', success: true }
  }

  async verifyOtp(email: string, otp: string) {
    console.log(`[INFO: AUTH SERVICE] Verifying OTP for ${email}`)
    
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      throw new BadRequestException('OTP must be a 6-digit number')
    }

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      console.error(`[INFO: AUTH SERVICE] Invalid email for OTP verification: ${email}`)
      throw new UnauthorizedException('Email not found in our system')
    }
    if (data.otp !== otp) {
      console.error(`[INFO: AUTH SERVICE] Invalid OTP for ${email}`)
      throw new BadRequestException('Invalid or expired OTP')
    }

    await this.supabase.getClient()
      .from('users')
      .update({ is_verified: true, otp: null })
      .eq('email', email)

    // Send welcome email after successful verification
    this.mailerClient.emit('send-welcome-email', { email })

    console.log(`[INFO: AUTH SERVICE] OTP verified successfully for ${email}`)
    return { success: true, message: 'Email verified successfully' }
  }

  async resendOtp(email: string) {
    console.log(`[INFO: AUTH SERVICE] Resending OTP for ${email}`)

    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }

    const { data: user, error } = await this.supabase.getClient()
      .from('users')
      .select('id, email, is_verified')
      .eq('email', email)
      .single()

    if (error || !user) {
      console.error(`[INFO: AUTH SERVICE] User not found for resend OTP: ${email}`)
      throw new UnauthorizedException('Email not found in our system')
    }

    if (user.is_verified) {
      throw new BadRequestException('Account is already verified')
    }

    const otp = crypto.randomInt(100000, 999999).toString()

    const { error: updateError } = await this.supabase.getClient()
      .from('users')
      .update({ otp })
      .eq('email', email)

    if (updateError) {
      console.error(`[INFO: AUTH SERVICE] Failed to update OTP for ${email}: ${updateError.message}`)
      throw new BadRequestException('Failed to resend OTP. Please try again')
    }

    await this.sendOtpEmail(email, otp, false)

    console.log(`[INFO: AUTH SERVICE] OTP resent successfully for ${email}`)
    return { success: true, message: 'OTP resent successfully' }
  }

  async validateUser(email: string, pass: string) {
    console.log(`[INFO: AUTH SERVICE] Validating user ${email}`)
    
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }
    if (!pass || pass.trim().length === 0) {
      throw new BadRequestException('Password is required')
    }

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      console.error(`[INFO: AUTH SERVICE] Invalid credentials for ${email}`)
      throw new UnauthorizedException('Invalid email or password')
    }
    if (!data.is_verified) {
      console.error(`[INFO: AUTH SERVICE] Email not verified: ${email}`)
      throw new UnauthorizedException('Email not verified. Please verify your email first')
    }

    const isMatch = await bcrypt.compare(pass, data.password_hash)
    if (!isMatch) {
      console.error(`[INFO: AUTH SERVICE] Password mismatch for ${email}`)
      throw new UnauthorizedException('Invalid email or password')
    }

    console.log(`[INFO: AUTH SERVICE] User validated: ${email}`)
    return data
  }

  async login(user: any) {
    console.log(`[INFO: AUTH SERVICE] Logging in user ${user.email}`)
    
    if (!user || !user.id || !user.email) {
      throw new BadRequestException('Invalid user data')
    }

    const payload = { sub: user.id, email: user.email, role: user.role }
    return {
      accessToken: this.jwt.sign(payload),
      role: user.role,
      id: user.id,
      email: user.email,
      success: true,
      message: 'Login successful'
    }
  }

  async requestPasswordReset(email: string) {
    console.log(`[INFO: AUTH SERVICE] Password reset requested for ${email}`)
    
    // Validate email
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }

    const { data: existingUser } = await this.supabase.getClient()
      .from('users')
      .select('id, personal_email')
      .eq('email', email)
      .single()

    if (!existingUser) {
      console.error(`[INFO: AUTH SERVICE] No such user found: ${email}`)
      // Return generic message for security
      return { message: 'If an account exists with this email, a password reset OTP has been sent', success: true }
    }

    const otp = crypto.randomInt(100000, 999999).toString()

    const { error } = await this.supabase.getClient()
      .from('users')
      .update({ otp })
      .eq('email', email)
    
      console.log(`[INFO: AUTH SERVICE] OTP updated for password reset for ${email} otp: ${otp}`)

    if (error) {
      console.error(`[INFO: AUTH SERVICE] Failed to update OTP for ${email}: ${error.message}`)
      throw new BadRequestException('Failed to process password reset request. Please try again')
    }

    await this.sendPasswordResetOtpEmails(email, otp, existingUser?.personal_email)
    return { message: 'Password reset OTP sent to your email', success: true }
  }

  async resendPasswordResetOtp(email: string) {
    console.log(`[INFO: AUTH SERVICE] Resending password reset OTP for ${email}`)

    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }

    const { data: existingUser } = await this.supabase.getClient()
      .from('users')
      .select('id, personal_email')
      .eq('email', email)
      .single()

    if (!existingUser) {
      console.error(`[INFO: AUTH SERVICE] No such user found for password reset OTP resend: ${email}`)
      return { message: 'If an account exists with this email, a password reset OTP has been sent', success: true }
    }

    const otp = crypto.randomInt(100000, 999999).toString()

    const { error } = await this.supabase.getClient()
      .from('users')
      .update({ otp })
      .eq('email', email)

    if (error) {
      console.error(`[INFO: AUTH SERVICE] Failed to update password reset OTP for ${email}: ${error.message}`)
      throw new BadRequestException('Failed to resend password reset OTP. Please try again')
    }

    console.log(`[INFO: AUTH SERVICE] OTP updated for password reset resend for ${email} otp: ${otp}`)

    await this.sendPasswordResetOtpEmails(email, otp, existingUser?.personal_email)
    return { message: 'Password reset OTP resent to your email', success: true }
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    console.log(`[INFO: AUTH SERVICE] Resetting password for ${email}`)
    
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format')
    }
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      throw new BadRequestException('OTP must be a 6-digit number')
    }
    if (!this.isValidPassword(newPassword)) {
      throw new BadRequestException('Password must be at least 8 characters and contain uppercase, lowercase, and numbers')
    }

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      console.error(`[INFO: AUTH SERVICE] Invalid email for password reset: ${email}`)
      throw new UnauthorizedException('Email not found in our system')
    }
    if (data.otp !== otp) {
      console.error(`[INFO: AUTH SERVICE] Invalid OTP for password reset: ${email}`)
      throw new BadRequestException('Invalid or expired OTP')
    }

    const hash = await bcrypt.hash(newPassword, 10)

    await this.supabase.getClient()
      .from('users')
      .update({ password_hash: hash, otp: null })
      .eq('email', email)

    console.log(`[INFO: AUTH SERVICE] Password reset successful for ${email}`)
    return { message: 'Password reset successfully', success: true }
  }

  async findOrCreateGoogleUser(profile: any) {
    console.log(`[INFO: AUTH SERVICE] Finding or creating Google user: ${profile.emails[0].value}`)
    const { data: existing, error: findError } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', profile.emails[0].value)
      .maybeSingle()

    if (findError) {
      console.error(`[INFO: AUTH SERVICE] Google user lookup error: ${findError.message}`)
      throw new Error(findError.message)
    }
    if (existing) {
      console.log(`[INFO: AUTH SERVICE] Google user exists: ${profile.emails[0].value}`)
      return { ...existing, success: true, message: 'User found' }
    }

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .insert([{ email: profile.emails[0].value, password_hash: '', role: 'patient', is_verified: true }])
      .select()
      .single()

    if (error) {
      console.error(`[INFO: AUTH SERVICE] Failed to create Google user: ${error.message}`)
      throw new Error(error.message)
    }

    console.log(`[INFO: AUTH SERVICE] Google user created: ${profile.emails[0].value}`)
    return { ...data, success: true, message: 'User created successfully' }
  }

  /**
   * Handle Fitbit OAuth callback - save tokens
   */
  async handleFitbitCallback(userId: string, fitbitData: any) {
    console.log(`[INFO: AUTH SERVICE] Handling Fitbit callback for user ${userId}`)
    
    const { fitbitId, accessToken, refreshToken } = fitbitData
    const expiresIn = 28800 // Fitbit tokens expire in 8 hours (28800 seconds)

    await this.fitbitService.saveTokens(userId, fitbitId, accessToken, refreshToken, expiresIn)

    console.log(`[INFO: AUTH SERVICE] Fitbit tokens saved for user ${userId}`)
    return { success: true, message: 'Fitbit connected successfully' }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    console.log(`[INFO: AUTH SERVICE] Getting user by email: ${email}`)
    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      console.error(`[INFO: AUTH SERVICE] User not found: ${email}`)
      return null
    }

    return data
  }





  async getUserByRoleAndId(role: string, id: string) {
  console.log(`[INFO: AUTH SERVICE] Getting user by role: ${role}, id: ${id}`)
  const { data: user, error: userError } = await this.supabase.getClient()
    .from('users')
    .select('id, email, role, personal_email')
    .eq('id', id)
    .single()

  if (userError || !user) {
    console.error(`[INFO: AUTH SERVICE] User not found: ${id}`)
    throw new UnauthorizedException('User not found')
  }

  let profile: Record<string, any> = {}

  switch (role) {
    case 'lab-technician':
      const { data: lab } = await this.supabase.getClient()
        .from('lab_technician_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (lab) profile = lab
      break

    case 'doctor':
      const mongoDoc = await this.doctorModel.findOne({ id }).lean().exec()
      if (mongoDoc) profile = mongoDoc
      break

    case 'patient':
      // ✅ fetch patient profile from Mongo
      const mongoProfile = await this.profileModel.findOne({ id }).lean().exec()
      if (mongoProfile) profile = mongoProfile
      break

    case 'nutritionist':
      const nut=await this.nutModel.findOne({id}).lean().exec()
      if (nut) profile = nut
      break

    case 'admin':
      profile = { admin: true }
      break

    default:
      console.error(`[INFO: AUTH SERVICE] Invalid role: ${role}`)
      throw new BadRequestException('Invalid role')
  }

  const merged: Record<string, any> = { ...user, ...profile }
  Object.keys(merged).forEach((key) => {
    if (merged[key] === null || merged[key] === undefined) merged[key] = ''
  })
  if (!merged.name || merged.name === '') merged.name = merged.email || 'user'

  console.log(`[INFO: AUTH SERVICE] User profile fetched successfully for id: ${id}`)
  return { ...merged, success: true, message: 'User profile fetched successfully' }
}


  async getUserRoleCounts() {
    console.log('[INFO: AUTH SERVICE] Getting user counts by role')

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('role, created_at')

    if (error) {
      console.error(`[INFO: AUTH SERVICE] Failed to fetch user role counts: ${error.message}`)
      throw new BadRequestException('Failed to fetch user role counts')
    }

    const roleCounts = new Map<string, number>()
    const now = new Date()
    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        date,
      }
    })
    const trendsByRole = new Map<string, Map<string, number>>()

    for (const row of data || []) {
      const role = this.normalizeRoleForCounts(row.role)
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1)

      if (!row.created_at) {
        continue
      }

      const createdAt = new Date(row.created_at)
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!monthBuckets.some((bucket) => bucket.key === monthKey)) {
        continue
      }

      if (!trendsByRole.has(role)) {
        trendsByRole.set(role, new Map<string, number>())
      }

      const roleTrend = trendsByRole.get(role)!
      roleTrend.set(monthKey, (roleTrend.get(monthKey) || 0) + 1)
    }

    const counts = Array.from(roleCounts.entries()).map(([role, count]) => ({ role, count }))
    const totalUsers = data?.length || 0
    const roleTrends = Array.from(roleCounts.keys()).map((role) => ({
      role,
      total: roleCounts.get(role) || 0,
      monthlyTrends: monthBuckets.map((bucket) => ({
        month: bucket.key,
        label: bucket.label,
        count: trendsByRole.get(role)?.get(bucket.key) || 0,
      })),
    }))

    console.log(`[INFO: AUTH SERVICE] User role counts fetched successfully. Total users: ${totalUsers}`)
    return {
      totalUsers,
      roleCounts: counts,
      roleTrends,
      success: true,
      message: 'User role counts fetched successfully',
    }
  }

  private normalizeRoleForCounts(role: string): string {
    if (!role) {
      return 'unknown'
    }

    if (role === 'lab-technician' || role === 'lab_technician' || role === 'pathologist') {
      return 'lab_technician'
    }

    return role
  }


  async upsertUserProfileByRole(role: string, profileData: Record<string, any>) {
  console.log(`[INFO: AUTH SERVICE] Upserting profile for role: ${role}`)
  const client = this.supabase.getClient()
 let profile: Record<string, any> | null = null


  switch (role) {
    case 'lab-technician':
      const { data: lab, error: labErr } = await client
        .from('lab_technician_profiles')
        .upsert(this.toDbProfile(profileData), { onConflict: 'id' })
        .select('*')
        .single()
      if (labErr) {
        console.error(`[INFO: AUTH SERVICE] Upsert failed for lab-technician: ${labErr.message}`)
        throw new BadRequestException(labErr.message)
      }
      profile = lab
      break

    case 'doctor':
      console.log("Upserting Doctor Data...")
      const existingDoc = await this.doctorModel.findOne({ id: profileData.id }).exec()
      if (existingDoc) {
        profile = await this.doctorModel.findOneAndUpdate(
          { id: profileData.id },
          { $set: profileData },
          { new: true },
        ).lean().exec()
      } else {
        const createdDoc = new this.doctorModel(profileData)
        profile = await createdDoc.save()
      }
      break

    case 'patient':
      // ✅ Upsert into Mongo instead of Supabase
      console.log("Upserting Patient Data...")
      const patientUpdateData = { ...profileData }
      const incomingAvatar = typeof patientUpdateData.avatar === 'string' ? patientUpdateData.avatar.trim() : ''
      const incomingImg = typeof patientUpdateData.img === 'string' ? patientUpdateData.img.trim() : ''

      if (!incomingAvatar && incomingImg) {
        patientUpdateData.avatar = incomingImg
      }

      delete patientUpdateData.img

      if (!patientUpdateData.avatar || (typeof patientUpdateData.avatar === 'string' && patientUpdateData.avatar.trim() === '')) {
        delete patientUpdateData.avatar
      }

      const existing = await this.profileModel.findOne({ id: profileData.id }).exec()
      if (existing) {
        profile = await this.profileModel.findOneAndUpdate(
          { id: profileData.id },
          { $set: patientUpdateData },
          { new: true },
        ).lean().exec()
      } else {
        const created = new this.profileModel(patientUpdateData)
        profile = await created.save()
      }
      break

    case 'nutritionist':
         console.log("Upserting nutritionist Data...")
  const existingNut = await this.nutModel.findOne({ id: profileData.id }).exec()
  if (existingNut) {
    profile = await this.nutModel.findOneAndUpdate(
      { id: profileData.id },
      { $set: profileData },
      { new: true },
    ).lean().exec()
  } else {
    const createdNut = new this.nutModel(profileData)
    profile = await createdNut.save()
  }
  break


    default:
      console.error(`[INFO: AUTH SERVICE] Invalid role for upsert: ${role}`)
      throw new BadRequestException('Invalid role')
  }

  console.log(`[INFO: AUTH SERVICE] Profile upserted successfully for role: ${role}`)
  return { ...profile, success: true, message: 'Profile upserted successfully' }
}


  toDbProfile(profileData: Record<string, any>) {
    const { dateofbirth, email, role, success,message, ...rest } = profileData
    return { ...rest, dateofbirth: dateofbirth }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return passwordRegex.test(password)
  }

  async upsertUserProfilePhoto(role: string, userId: string, fileBuffer: any) {
    console.log(`[INFO: AUTH SERVICE] Uploading profile photo for user ${userId}, role: ${role}`)
    const client = this.supabase.getClient()
    let error

    if (fileBuffer && fileBuffer.type === 'Buffer') fileBuffer = Buffer.from(fileBuffer.data)

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `user_profiles/${role}` },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      const readable = new Readable()
      readable.push(fileBuffer)
      readable.push(null)
      readable.pipe(uploadStream)
    }).catch(err => {
      console.error(`[INFO: AUTH SERVICE] Cloudinary upload error: ${err.message}`)
      throw new BadRequestException('Failed to upload image')
    })

    const imgUrl = uploadResult.secure_url
    console.log(`[INFO: AUTH SERVICE] Uploaded image URL: ${imgUrl}`)

    switch (role) {
  case 'lab-technician':
    ({ error } = await client
      .from('lab_technician_profiles')
      .upsert(
        { id: userId, img: imgUrl }, 
        { onConflict: 'id' }
      )
      .select('*')
      .single())
    break
  case 'doctor':
    const existingDocPhoto = await this.doctorModel.findOne({ id: userId }).exec()
    if (existingDocPhoto) {
      await this.doctorModel.findOneAndUpdate(
        { id: userId },
        { $set: { img: imgUrl } },
        { new: true },
      ).lean().exec()
    } else {
      const createdDocPhoto = new this.doctorModel({ id: userId, img: imgUrl })
      await createdDocPhoto.save()
    }
    break
  case 'patient':
    const existingPatientPhoto = await this.profileModel.findOne({ id: userId }).exec()
    if (existingPatientPhoto) {
      await this.profileModel.findOneAndUpdate(
        { id: userId },
        { $set: { avatar: imgUrl } },
        { new: true },
      ).lean().exec()
    } else {
      const createdPatientPhoto = new this.profileModel({ id: userId, avatar: imgUrl })
      await createdPatientPhoto.save()
    }
    break
    
  case 'nutritionist':
    const existingNut = await this.nutModel.findOne({ id: userId }).exec()
    if (existingNut) {
      await this.nutModel.findOneAndUpdate(
        { id: userId },
        { $set: { img: imgUrl } }, // only update img
        { new: true },
      ).lean().exec()
    } else {
      const createdNut = new this.nutModel({ id: userId, img: imgUrl })
      await createdNut.save()
    }
    break

  default:
    console.error(`[INFO: AUTH SERVICE] Invalid role: ${role}`)
    throw new BadRequestException('Invalid role')
}


    if (error) {
      console.error(`[INFO: AUTH SERVICE] Supabase upsert error for photo: ${error.message}`)
      throw new BadRequestException('Failed to update profile image')
    }

    console.log(`[INFO: AUTH SERVICE] Profile photo updated successfully for user ${userId}`)
    return { img: imgUrl, success: true, message: 'Profile photo updated successfully' }
  }
}
