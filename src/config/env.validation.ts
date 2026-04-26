import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  MONGO_URI: Joi.string().required(),
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().allow('', null).optional(),
  REDIS_DB: Joi.number().optional(),
  JWT_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
  AWS_REGION: Joi.string().allow('').default(''),
  AWS_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_KEY: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_BUCKET: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),
  AWS_SIGNED_URL_EXPIRES_IN: Joi.number().default(3600),
  DAILY_PROFIT_RATE: Joi.number().default(0.025),
  SIGNUP_REFERRAL_BONUS: Joi.number().default(10),
  MIN_WITHDRAWAL_AMOUNT: Joi.number().default(25),
  REFERRAL_MILESTONE_5: Joi.number().default(25),
  REFERRAL_MILESTONE_10: Joi.number().default(75),
  REFERRAL_MILESTONE_25: Joi.number().default(250),
  REFERRAL_MILESTONE_50: Joi.number().default(750),
})
  .custom((value, helpers) => {
    if (!value.JWT_SECRET && !value.JWT_ACCESS_SECRET) {
      return helpers.error('any.custom', {
        message: '"JWT_SECRET" or "JWT_ACCESS_SECRET" is required',
      });
    }

    if (!value.REDIS_URL && !(value.REDIS_HOST && value.REDIS_PORT)) {
      return helpers.error('any.custom', {
        message: '"REDIS_URL" or both "REDIS_HOST" and "REDIS_PORT" are required',
      });
    }

    return value;
  });
