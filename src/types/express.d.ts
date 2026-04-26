import { UserRole } from '../modules/user/schemas/role.schema';

declare global {
  namespace Express {
    interface User {
      sub: string;
      email: string;
      role: UserRole;
    }
  }
}

export {};
