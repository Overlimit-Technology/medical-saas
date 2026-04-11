import type {
  CreateUserInput,
  DeleteUserResult,
  UpdateUserDetailInput,
  User,
  UserClinicsSelection,
} from "../entities/User";
import type { UsersRepository } from "../repositories/UsersRepository";

export class GetUsersUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(): Promise<User[]> {
    return this.repo.getUsers();
  }
}

export class GetUserClinicsUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(): Promise<UserClinicsSelection> {
    return this.repo.getUserClinics();
  }
}

export class CreateUserUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(input: CreateUserInput): Promise<void> {
    await this.repo.createUser(input);
  }
}

export class DeleteUserUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(userId: string): Promise<DeleteUserResult> {
    return this.repo.deleteUser(userId);
  }
}

export class GetUserDetailUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(userId: string): Promise<User | null> {
    return this.repo.getUserDetail(userId);
  }
}

export class UpdateUserDetailUseCase {
  constructor(private readonly repo: UsersRepository) {}

  async execute(userId: string, input: UpdateUserDetailInput): Promise<void> {
    await this.repo.updateUserDetail(userId, input);
  }
}
