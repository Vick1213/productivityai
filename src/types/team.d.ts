//-----------------------------------------------------------------------------//
//  @types/team – shared Team domain models for the frontend layer              //
//-----------------------------------------------------------------------------//
//  These lightweight interfaces mirror a subset of our Prisma schema, pared
//  down for what the UI actually needs. Feel free to extend as new features
//  surface, but try to avoid leaking DB‑only fields into the client bundle.
//-----------------------------------------------------------------------------//

export interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    jobTitle?: string | null;
    role?: string | null; // e.g. “Admin”, “Contributor”
    avatarUrl?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }
  
  export interface Project {
    id: string;
    name: string;
    description?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }
  
  export interface Note {
    id: string;
    title: string;
    body: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }
  
  export interface Organization {
    id: string;
    name: string;
    members: Member[];
    projects: Project[];
    notes: Note[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }
  