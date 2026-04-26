import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export class RegisterUserDto extends CreateUserDto {
  @ApiPropertyOptional({
    example: 'ABC12345',
    description: 'Referral code used during sign up',
  })
  referralCode?: string;
}
