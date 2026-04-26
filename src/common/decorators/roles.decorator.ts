import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/app.constants';
import { UserRole } from '../../modules/user/schemas/role.schema';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
