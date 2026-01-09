import { UserRole } from '@prisma/client';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from './db';

export type CurrentUser = {
  id: string;
  orgId: string;
  role: UserRole;
  email: string;
  name: string;
  locationIds: string[];
};

export class LocationAccessError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'LocationAccessError';
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const user = session.user as any;
  const access = await prisma.locationAccess.findMany({
    where: { userId: user.id },
    select: { locationId: true },
  });
  
  return {
    id: user.id,
    orgId: user.orgId,
    role: user.role as UserRole,
    email: user.email!,
    name: user.name!,
    locationIds: access.map((a) => a.locationId),
  };
}

export function canAccessLocation(user: CurrentUser, locationId?: string | null): boolean {
  if (!locationId) return true;
  if (user.role === 'ADMIN') return true;
  return user.locationIds.includes(locationId);
}

/**
 * Resolve which locationIds are permitted for the user given an optional requested subset.
 * Returns null when the user can access all locations (admin with no specific filter).
 * Throws LocationAccessError when the request includes a location outside the user's scope.
 */
export function getPermittedLocationIds(user: CurrentUser, requested?: string[]): string[] | null {
  const req = (requested || []).filter(Boolean);

  if (user.role === 'ADMIN') {
    return req.length > 0 ? req : null;
  }

  if (req.length === 0) {
    return user.locationIds;
  }

  const invalid = req.filter((id) => !user.locationIds.includes(id));
  if (invalid.length > 0) {
    throw new LocationAccessError('Location access denied');
  }

  return req;
}
