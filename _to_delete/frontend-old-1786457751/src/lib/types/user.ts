export type UserRole = "doctor" | "pharmacist" | "hospital_admin" | "federation_admin";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  title?: string;
  department?: string;
  hospitalNode?: string;
  avatarInitials: string;
}

export interface DoctorRef {
  id: string;
  name: string;
  specialty?: string;
}

export interface PharmacistRef {
  id: string;
  name: string;
}
