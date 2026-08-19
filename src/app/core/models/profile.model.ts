export type ProfileRole = 'admin' | 'member';

export interface Profile {
  id: string;
  displayName: string;
  role: ProfileRole;
  createdAt: string;
}
