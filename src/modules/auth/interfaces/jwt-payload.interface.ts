import { UserRole } from '../../user/schemas/role.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
}
