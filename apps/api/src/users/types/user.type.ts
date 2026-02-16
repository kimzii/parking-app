import {
  User,
  UserRole,
  Role,
  VerificationStatus,
  RoleName,
} from '@prisma/client';

// User with roles populated
export type UserWithRoles = User & {
  userRoles: (UserRole & {
    role: Role;
  })[];
};

// User profile response
export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profilePicture: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: RoleName[];
  roleStatuses: {
    role: RoleName;
    status: VerificationStatus;
  }[];
}

// User list item
export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: RoleName[];
  roleStatuses: {
    role: RoleName;
    status: VerificationStatus;
  }[];
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// User statistics
export interface UserStatistics {
  total: number;
  byStatus: {
    pending: number;
    approved: number;
    blocked: number;
  };
  byRole: {
    drivers: number;
    hosts: number;
    admins: number;
  };
}
