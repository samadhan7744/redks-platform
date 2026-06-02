import { Role } from '@prisma/client';

export type AuthUser = {
  sub: string;
  phone: string;
  roles: Role[];
};
