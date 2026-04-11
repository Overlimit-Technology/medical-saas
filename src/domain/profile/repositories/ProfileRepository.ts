import type { UpdateProfileInput, UserProfile } from "../entities/Profile";

export interface ProfileRepository {
  getMyProfile(): Promise<UserProfile>;
  updateMyProfile(input: UpdateProfileInput): Promise<UserProfile>;
  uploadProfileImage(file: File): Promise<string>;
}
