import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UserRole } from '../../user/schemas/role.schema';
import { AdminService } from '../services/admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Admin analytics dashboard' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'Activity logs' })
  getActivityLogs(@Query() query: PaginationDto) {
    return this.adminService.getActivityLogs(query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.adminService.updateSettings(body as never);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a user from the admin panel' })
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }
}
