import type {
  CreateUserInput,
  DeleteUserResult,
  UpdateUserDetailInput,
  User,
  UserClinicsSelection,
} from "../entities/User";

export interface UsersRepository {
  getUsers(): Promise<User[]>;
  getUserClinics(): Promise<UserClinicsSelection>;
  createUser(input: CreateUserInput): Promise<void>;
  deleteUser(userId: string): Promise<DeleteUserResult>;
  getUserDetail(userId: string): Promise<User | null>;
  updateUserDetail(userId: string, input: UpdateUserDetailInput): Promise<void>;
}
