export type ClinicInfo = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  openingTime: string | null;
  closingTime: string | null;
};

export type ClinicInfoInput = {
  name?: string;
  city?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
};
