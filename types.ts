import { Timestamp } from "firebase/firestore";

export enum CampaignStatus {
  DRAFT = "Draft",
  ACTIVE = "Active",
  PAUSED = "Paused",
  CLOSED = "Closed",
}

export enum FormFieldType {
  TEXT = "Text",
  EMAIL = "Email",
  PHONE = "Phone",
  DROPDOWN = "Dropdown",
  DATE = "Date",
  FILE = "File Upload",
  LONG_TEXT = "Long Text",
}

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  originalHeader: string;
};

export type CampaignTheme = "blue" | "red" | "purple" | "orange" | "green";

export interface Campaign {
  id: string;
  name: string;
  pin: string;
  status: CampaignStatus;
  theme: CampaignTheme;
  fields: FormField[];
  adminId: string;
  createdAt: Timestamp;
  participantCount: number;
  submissionCount: number;
  closedAt?: Timestamp;
  description?: string;
}

export interface Submission {
  id: string; // Will be the user's ID from the uploaded list
  campaignId: string;
  campaignName: string; // Denormalized for easier display
  data: { [key: string]: any };
  status: "Pending" | "Submitted" | "Updated";
  submittedAt?: Timestamp;
  updatedAt?: Timestamp;
}