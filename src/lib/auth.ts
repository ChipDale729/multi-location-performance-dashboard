import { UserRole } from '@prisma/client';

export type CurrentUser = {
  id: string;
  orgId: string;
  role: UserRole;
  email: string;
  name: string;
};

export function getCurrentUser(): CurrentUser {
  return {
    id: 'user',
    orgId: 'org',
    role: 'ADMIN', 
    email: 'demoadmin@org.com',
    name: 'Demo Admin',
  };
}
