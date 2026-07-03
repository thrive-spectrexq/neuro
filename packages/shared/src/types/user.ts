export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface UserCreate {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UserLogin {
  username: string;
  passwordHash: string;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
