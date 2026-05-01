export type UserProfile = {
  id: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  image: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  clinicLabel: string | null;
  teamCategoryId: string | null;
  teamCategoryName: string | null;
};

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  image: string;
  teamCategoryId?: string | null;
};
