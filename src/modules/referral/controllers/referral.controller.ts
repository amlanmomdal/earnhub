import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ReferralService } from '../services/referral.service';

@ApiTags('Referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('my-link')
  @ApiOperation({ summary: 'Get referral link' })
  getMyLink(@CurrentUser('sub') userId: string) {
    return this.referralService.getMyLink(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral stats' })
  getStats(@CurrentUser('sub') userId: string) {
    return this.referralService.getStats(userId);
  }
}
