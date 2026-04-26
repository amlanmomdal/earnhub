import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof Express.User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: Express.User }>();
    if (!request.user) {
      return undefined;
    }

    return data ? request.user[data] : request.user;
  },
);
