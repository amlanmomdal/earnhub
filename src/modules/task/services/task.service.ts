import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { S3Service } from '../../../s3/s3.service';
import { RedisService } from '../../../redis/redis.service';
import { paginate } from '../../../database/helpers/pagination.helper';
import { ActivityLog } from '../../../database/schemas/activity-log.schema';
import { Task, TaskDocument } from '../../../database/schemas/task.schema';
import {
  UserTaskCompletion,
  UserTaskCompletionDocument,
} from '../../../database/schemas/user-task-completion.schema';
import { WalletTransaction } from '../../../database/schemas/wallet-transaction.schema';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { CreateTaskDto } from '../dto/create-task.dto';
import { SubmissionQueryDto } from '../dto/submission-query.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(UserTaskCompletion.name)
    private readonly completionModel: Model<UserTaskCompletionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransaction>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
  ) {}

  async listTasks(query: TaskQueryDto) {
    const cacheKey = `task_list_cache:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const filter: Record<string, unknown> = { isActive: true, isDeleted: false };
    if (query.category) filter.category = query.category;
    if (query.difficulty) filter.difficulty = query.difficulty;

    const result = await paginate(this.taskModel, filter, query);
    await this.redisService.set(cacheKey, result, 300);
    return result;
  }

  async getTask(taskId: string) {
    const task = await this.taskModel.findOne({ _id: taskId, isDeleted: false }).lean().exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async submitTask(
    userId: string,
    taskId: string,
    input: { proofText?: string; file?: Express.Multer.File },
  ) {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task || task.isDeleted) {
      throw new NotFoundException('Task not found');
    }
    if (!task.isActive) {
      throw new BadRequestException('Task is inactive');
    }
    if (new Date(task.deadline).getTime() < Date.now()) {
      throw new BadRequestException('Task deadline has passed');
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const existing = await this.completionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        taskId: task._id,
        submissionDate: startOfDay,
      })
      .exec();

    if (existing && existing.status !== 'rejected') {
      throw new BadRequestException('Task already submitted today');
    }
    if (existing && existing.resubmissionCount >= 1) {
      throw new BadRequestException('Resubmission limit reached');
    }

    const perDayKey = `task_submission_count:${userId}:${startOfDay.toISOString()}`;
    const count = await this.redisService.incrementWithExpiry(perDayKey, 86400);
    if (count !== null && count > 10) {
      throw new BadRequestException('Daily submission limit reached');
    }

    let proofUrl = '';
    let proofType: 'image' | 'video' | 'text' = 'text';

    if (input.file) {
      if (!['image/jpeg', 'image/png', 'video/mp4'].includes(input.file.mimetype)) {
        throw new BadRequestException('Unsupported file type');
      }
      if (input.file.size > 50 * 1024 * 1024) {
        throw new BadRequestException('File exceeds 50MB limit');
      }

      const extension = input.file.originalname.split('.').pop() ?? 'bin';
      const key = `proofs/${userId}/${taskId}/${Date.now()}.${extension}`;
      proofUrl = await this.s3Service.uploadFile(input.file, key);
      proofType = input.file.mimetype.startsWith('video/') ? 'video' : 'image';
    } else if (input.proofText) {
      proofType = 'text';
    } else {
      throw new BadRequestException('Proof file or proof text is required');
    }

    if (existing) {
      existing.proofText = input.proofText ?? '';
      existing.proofType = proofType;
      existing.proofUrl = proofUrl;
      existing.status = 'pending';
      existing.rejectionReason = '';
      existing.reviewedAt = null;
      existing.reviewedBy = null;
      existing.submittedAt = new Date();
      existing.resubmissionCount += 1;
      await existing.save();
      return existing.toObject();
    }

    const completion = await this.completionModel.create({
      userId: new Types.ObjectId(userId),
      taskId: task._id,
      proofUrl,
      proofType,
      proofText: input.proofText ?? '',
      status: 'pending',
      submittedAt: new Date(),
      submissionDate: startOfDay,
    });

    return completion.toObject();
  }

  async myCompletions(userId: string, query: SubmissionQueryDto) {
    return paginate(
      this.completionModel,
      { userId: new Types.ObjectId(userId) },
      query,
    );
  }

  createTask(dto: CreateTaskDto) {
    return this.taskModel.create({
      ...dto,
      deadline: new Date(dto.deadline),
      requirements: dto.requirements ?? [],
      isActive: dto.isActive ?? true,
    });
  }

  async updateTask(taskId: string, dto: UpdateTaskDto) {
    const task = await this.taskModel
      .findByIdAndUpdate(
        taskId,
        {
          ...dto,
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async softDeleteTask(taskId: string) {
    const task = await this.taskModel
      .findByIdAndUpdate(taskId, { isActive: false }, { new: true })
      .lean()
      .exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  listSubmissions(query: SubmissionQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    return paginate(this.completionModel, filter, query);
  }

  async approveSubmission(submissionId: string, adminUserId: string) {
    const completion = await this.completionModel.findById(submissionId).exec();
    if (!completion) {
      throw new NotFoundException('Submission not found');
    }
    if (completion.status === 'approved') {
      throw new BadRequestException('Submission already approved');
    }

    completion.status = 'approved';
    completion.reviewedAt = new Date();
    completion.reviewedBy = new Types.ObjectId(adminUserId);
    await completion.save();

    const task = await this.taskModel.findById(completion.taskId).lean().exec();
    const user = await this.userModel.findById(completion.userId).exec();
    if (task && user) {
      const balanceBefore = user.balance.pending;
      user.balance.pending += task.rewardAmount;
      user.balance.totalEarned += task.rewardAmount;
      await user.save();

      await this.walletTransactionModel.create({
        userId: user._id,
        type: 'task_reward',
        amount: task.rewardAmount,
        description: `Reward for task ${task.title}`,
        balanceBefore,
        balanceAfter: user.balance.pending,
      });
    }

    await this.activityLogModel.create({
      userId: new Types.ObjectId(adminUserId),
      action: 'task_submission_approved',
      metadata: { submissionId },
    });

    return completion.toObject();
  }

  async rejectSubmission(submissionId: string, adminUserId: string, reason: string) {
    const completion = await this.completionModel
      .findByIdAndUpdate(
        submissionId,
        {
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedBy: new Types.ObjectId(adminUserId),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!completion) {
      throw new NotFoundException('Submission not found');
    }

    await this.activityLogModel.create({
      userId: new Types.ObjectId(adminUserId),
      action: 'task_submission_rejected',
      metadata: { submissionId, reason },
    });

    return completion;
  }

  async hasCompletedAllActiveTasksToday(userId: string) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [activeTasks, completed] = await Promise.all([
      this.taskModel.countDocuments({ isActive: true, isDeleted: false }).exec(),
      this.completionModel
        .countDocuments({
          userId: new Types.ObjectId(userId),
          status: 'approved',
          submissionDate: startOfDay,
        })
        .exec(),
    ]);

    return activeTasks > 0 && activeTasks === completed;
  }
}
