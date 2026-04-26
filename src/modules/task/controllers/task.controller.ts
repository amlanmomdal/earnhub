import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SubmissionQueryDto } from '../dto/submission-query.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { TaskService } from '../services/task.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List active tasks' })
  listTasks(@Query() query: TaskQueryDto) {
    return this.taskService.listTasks(query);
  }

  @Get('my-completions')
  @ApiOperation({ summary: 'List user task submissions' })
  myCompletions(@CurrentUser('sub') userId: string, @Query() query: SubmissionQueryDto) {
    return this.taskService.myCompletions(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task detail' })
  getTask(@Param('id') taskId: string) {
    return this.taskService.getTask(taskId);
  }

  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('proofFile'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit task proof' })
  submitTask(
    @CurrentUser('sub') userId: string,
    @Param('id') taskId: string,
    @Body('proofText') proofText?: string,
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        fileIsRequired: false,
      }),
    )
    proofFile?: Express.Multer.File,
  ) {
    return this.taskService.submitTask(userId, taskId, { proofText, file: proofFile });
  }
}
