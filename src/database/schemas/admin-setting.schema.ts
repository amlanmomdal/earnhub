import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminSettingDocument = HydratedDocument<AdminSetting>;

@Schema({ collection: 'adminSettings', timestamps: true, versionKey: false })
export class AdminSetting {
  @Prop({ required: true, default: 0.025 })
  dailyProfitRate!: number;

  @Prop({ required: true, default: 'EarnHub Simulator' })
  platformName!: string;

  @Prop({ required: true, default: false })
  maintenanceMode!: boolean;

  @Prop({ required: true, default: 10 })
  signupReferralBonus!: number;

  @Prop({ required: true, default: 25 })
  minWithdrawalAmount!: number;

  @Prop({
    type: Object,
    default: { '5': 25, '10': 75, '25': 250, '50': 750 },
  })
  referralMilestones!: Record<string, number>;
}

export const AdminSettingSchema = SchemaFactory.createForClass(AdminSetting);
