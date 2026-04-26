import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/schemas/role.schema';
import { CreateTaskDto } from '../dto/create-task.dto';
import { ReviewSubmissionDto } from '../dto/review-submission.dto';
import { SubmissionQueryDto } from '../dto/submission-query.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskService } from '../services/task.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/tasks')
export class AdminTaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create task' })
  createTask(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  updateTask(@Param('id') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(taskId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete task' })
  deleteTask(@Param('id') taskId: string) {
    return this.taskService.softDeleteTask(taskId);
  }

  @Get('submissions')
  @ApiOperation({ summary: 'List task submissions' })
  listSubmissions(@Query() query: SubmissionQueryDto) {
    return this.taskService.listSubmissions(query);
  }

  @Patch('submissions/:id/approve')
  @ApiOperation({ summary: 'Approve task submission' })
  approve(@Param('id') submissionId: string, @CurrentUser('sub') adminUserId: string) {
    return this.taskService.approveSubmission(submissionId, adminUserId);
  }

  @Patch('submissions/:id/reject')
  @ApiOperation({ summary: 'Reject task submission' })
  reject(
    @Param('id') submissionId: string,
    @CurrentUser('sub') adminUserId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.taskService.rejectSubmission(
      submissionId,
      adminUserId,
      dto.reason ?? 'Submission rejected',
    );
  }
}
