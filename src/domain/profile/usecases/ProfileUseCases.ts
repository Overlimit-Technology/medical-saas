import type { UpdateProfileInput, UserProfile } from "../entities/Profile";
import type { ProfileRepository } from "../repositories/ProfileRepository";

export class GetMyProfileUseCase {
  constructor(private readonly repo: ProfileRepository) {}

  async execute(): Promise<UserProfile> {
    return this.repo.getMyProfile();
  }
}

export class UpdateMyProfileUseCase {
  constructor(private readonly repo: ProfileRepository) {}

  async execute(input: UpdateProfileInput): Promise<UserProfile> {
    return this.repo.updateMyProfile(input);
  }
}

export class UploadProfileImageUseCase {
  constructor(private readonly repo: ProfileRepository) {}

  async execute(file: File): Promise<string> {
    return this.repo.uploadProfileImage(file);
  }
}
