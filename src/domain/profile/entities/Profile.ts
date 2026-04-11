export type UserProfile = {
  id: string;
  email: string;
  role: string;
  image: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  clinicLabel: string | null;
};

export type UpdateProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  image: string;
};
