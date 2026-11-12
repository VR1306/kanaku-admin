export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  role: string;
  roleLabel: string;
  mfa: boolean;
  lastActive: string | null;
}
export interface Device {
  sid: string;
  device: string;
  ip: string;
  created: string;
  last: string;
  current: boolean;
}
