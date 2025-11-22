import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'placement_head' | 'training_head' | 'student';

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return data?.map(r => r.role as UserRole) || [];
}

export function hasRole(userRoles: UserRole[], role: UserRole): boolean {
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: UserRole[], roles: UserRole[]): boolean {
  return roles.some(role => userRoles.includes(role));
}

export function isAdmin(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, 'admin');
}

export function isPlacementHead(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, 'placement_head');
}

export function isTrainingHead(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, 'training_head');
}

export function isStudent(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, 'student');
}
