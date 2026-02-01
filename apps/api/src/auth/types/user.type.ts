export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
}
