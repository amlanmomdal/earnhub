import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UserRole } from '../schemas/role.schema';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Get('users/me/transactions')
  @ApiOperation({ summary: 'Get my wallet transactions' })
  myTransactions(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.userService.getMyTransactions(userId, query);
  }

  @Get('users/me/referrals')
  @ApiOperation({ summary: 'Get my referrals' })
  myReferrals(@CurrentUser('sub') userId: string) {
    return this.userService.getMyReferrals(userId);
  }

  @Get('admin/users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users' })
  listUsers(
    @Query() query: PaginationDto & { status?: string; kycStatus?: string; search?: string },
  ) {
    return this.userService.listUsers(query);
  }

  @Get('admin/users/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user detail' })
  getUserDetail(@Param('id') userId: string) {
    return this.userService.getUserDetail(userId);
  }

  @Patch('admin/users/:id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user status' })
  updateStatus(
    @Param('id') userId: string,
    @Body('status') status: 'active' | 'inactive' | 'banned',
  ) {
    return this.userService.updateUserStatus(userId, status);
  }

  @Post('admin/users/:id/credit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually credit user balance' })
  creditUser(
    @Param('id') userId: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
  ) {
    return this.userService.creditUser(userId, amount, reason);
  }
}
