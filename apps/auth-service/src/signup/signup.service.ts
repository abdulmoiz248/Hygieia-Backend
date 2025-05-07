import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto,Role } from './user.dto';
import { microserviceClients } from 'apps/client';
import { ClientProxy } from '@nestjs/microservices';


const saltRounds = 10;
@Injectable()
export class SignupService {
 


    constructor(private readonly prisma: PrismaService,
        @Inject(microserviceClients.emailService.name) private readonly emailClient: ClientProxy // Inject the email service client
    ) {}

    

    async  hashPassword(password: string): Promise<string> {
      return await bcrypt.hash(password, saltRounds);
    }
    
    async  comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
      return await bcrypt.compare(plainPassword, hashedPassword);
    }



 
    async signup(name: string, email: string, password: string, role: Role) {
      try {
        const user = await this.prisma.user.findUnique({ where: { email } });
    
        if (user) {
          return {
            statusCode: 400,
            message: 'Email already exists',
            success: false,
          };
        }
    
        const hashedPassword = await this.hashPassword(password);
    
        if (role === Role.PATIENT) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
          const data: CreateUserDto = {
            name,
            email,
            password: hashedPassword,
            role,
            otp,
            otpExpiry,
          };
    
          const patient = await this.prisma.user.create({ data });
    
          console.log(`[INFO] A new ${role} has signed up successfully named ${name}`);
          this.emailClient.emit('send_otp', { email, otp });
    
          return {
            statusCode: 200,
            message: 'Patient created and OTP sent successfully',
            success: true,
            data: patient,
          };
        }
    
        const data: CreateUserDto = {
          name,
          email,
          password: hashedPassword,
          role,
        };
    
        const userCreated = await this.prisma.user.create({ data });
    
        console.log(`[INFO] ${role} created successfully`);
        return {
          statusCode: 200,
          message: `${role} created successfully`,
          success: true,
          data: userCreated,
        };
      } catch (error) {
        console.error('[ERROR] Signup failed:', error);
        return {
          statusCode: 500,
          message: 'Something went wrong during signup',
          success: false,
        };
      }
    }
    

   
}
