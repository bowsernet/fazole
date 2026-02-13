export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  role: UserRole;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}
