import { Controller, Post } from '@nestjs/common';
import { SignupService } from './signup.service';
import { Role } from './user.dto';
import { MessagePattern } from '@nestjs/microservices';

@Controller('signup')
export class SignupController {
  constructor(private readonly signupService: SignupService) {}
  
   @MessagePattern('signup')
   async signup(data: { name: string; email: string; password: string; role?: Role }) {
     const { name, email, password, role } = data;
     return this.signupService.signup(name, email, password, role);
   }
   
}
