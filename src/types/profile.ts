export type ClientProfile = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  address?: { city?: string | null; state?: string | null; zip?: string | null } | null;
};
