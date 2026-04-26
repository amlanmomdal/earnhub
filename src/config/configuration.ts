export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/nest_setup',
  },
  jwt: {
    accessSecret:
      process.env.JWT_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      'access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    url:
      process.env.REDIS_URL ??
      `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`,
  },
  aws: {
    region: process.env.AWS_REGION ?? 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey:
      process.env.AWS_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
    s3Bucket: process.env.AWS_BUCKET ?? process.env.AWS_S3_BUCKET ?? '',
    signedUrlExpiresIn: Number(process.env.AWS_SIGNED_URL_EXPIRES_IN ?? 900),
  },
  earnhub: {
    dailyProfitRate: Number(process.env.DAILY_PROFIT_RATE ?? 0.025),
    signupReferralBonus: Number(process.env.SIGNUP_REFERRAL_BONUS ?? 10),
    minWithdrawalAmount: Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 25),
    referralMilestones: {
      '5': Number(process.env.REFERRAL_MILESTONE_5 ?? 25),
      '10': Number(process.env.REFERRAL_MILESTONE_10 ?? 75),
      '25': Number(process.env.REFERRAL_MILESTONE_25 ?? 250),
      '50': Number(process.env.REFERRAL_MILESTONE_50 ?? 750),
    },
  },
});
