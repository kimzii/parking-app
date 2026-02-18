export type User = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  profilePicture?: string | null;
  emailVerified?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  roles?: string[];
  roleStatuses?: { role: string; status: string }[];
};
