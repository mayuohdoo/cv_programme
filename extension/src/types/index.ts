/**
 * Core Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout the extension.
 */

/**
 * Resume Version
 * Represents a stored resume with metadata
 */
export interface ResumeVersion {
  id: string;                    // UUID
  name: string;                  // User-assigned name
  fileName: string;              // Original file name
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
  data: ResumeJSON;              // Structured resume data
  encrypted: boolean;            // Whether sensitive fields are encrypted
}

/**
 * Resume JSON Schema
 * Structured representation of resume data
 */
export interface ResumeJSON {
  personalInfo: PersonalInfo;
  education: EducationEntry[];
  workExperience: WorkEntry[];
  projects: ProjectEntry[];
  skills: Skills;
  summary?: string;
  customFields?: Record<string, any>;
}

/**
 * Personal Information
 */
export interface PersonalInfo {
  name: string;
  phone: string;                 // Encrypted
  email: string;                 // Encrypted
  address?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

/**
 * Education Entry
 */
export interface EducationEntry {
  institution: string;
  degree: string;
  major: string;
  startDate: string;             // YYYY-MM format
  endDate: string;               // YYYY-MM format or "Present"
  gpa?: string;
  achievements?: string[];
}

/**
 * Work Experience Entry
 */
export interface WorkEntry {
  company: string;
  position: string;
  startDate: string;             // YYYY-MM format
  endDate: string;               // YYYY-MM format or "Present"
  location?: string;
  responsibilities: string[];
  achievements?: string[];
}

/**
 * Project Entry
 */
export interface ProjectEntry {
  name: string;
  description: string;
  role: string;
  startDate?: string;
  endDate?: string;
  technologies: string[];
  highlights: string[];
  url?: string;
}

/**
 * Skills
 */
export interface Skills {
  technical: string[];
  languages: string[];
  certifications: string[];
}

/**
 * Application Record
 * Represents a job application submission
 */
export interface ApplicationRecord {
  id: string;                    // UUID
  resumeId: string;              // Reference to ResumeVersion
  resumeName: string;            // Snapshot of resume name
  companyName: string;
  positionName: string;
  url: string;                   // Career page URL
  timestamp: number;             // Unix timestamp
  status: ApplicationStatus;
  notes?: string;
  followUpDate?: number;         // Unix timestamp
  
  // Autofill metadata
  autofillSuccess: boolean;
  filledFields: number;
  totalFields: number;
}

/**
 * Application Status
 */
export type ApplicationStatus = 
  | '已投递'
  | '已查看'
  | '待面试'
  | '已面试'
  | '已拒绝'
  | '已接受';

/**
 * Field Metadata
 * Information about a form field
 */
export interface FieldMetadata {
  element: HTMLElement;
  type: FieldType;
  name: string;
  id: string;
  placeholder: string;
  label: string;
  ariaLabel: string;
  required: boolean;
  maxLength?: number;
  pattern?: string;
  options?: string[];            // For select/radio fields
}

/**
 * Field Type
 */
export type FieldType = 
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'date'
  | 'url';

/**
 * Form Detection Result
 */
export interface FormDetectionResult {
  detected: boolean;
  forms: FormAnalysis[];
  recruitmentForm: FormAnalysis | null;
}

/**
 * Form Analysis
 */
export interface FormAnalysis {
  element: HTMLFormElement;
  fields: FieldMetadata[];
  companyName: string;
  positionName: string;
  confidence: number;            // 0-1
}

/**
 * Field Mapping
 */
export interface FieldMapping {
  field: FieldMetadata;
  resumeKey: string;
  value: any;
  confidence: number;
}

/**
 * Autofill Result
 */
export interface AutofillResult {
  status: 'success' | 'partial' | 'error';
  filledFields: number;
  totalFields: number;
  errors: AutofillError[];
}

/**
 * Autofill Error
 */
export interface AutofillError {
  field: string;
  type: 'FIELD_NOT_FOUND' | 'READONLY' | 'VALIDATION_FAILED';
  message: string;
  value?: any;
}

/**
 * Message Types for Extension Communication
 */
export type MessageType =
  // Extension → Web Page
  | 'EXTENSION_READY'
  | 'RESUME_LIST_UPDATE'
  | 'ACTIVE_RESUME_CHANGED'
  | 'FORM_DETECTED'
  | 'AUTOFILL_STATUS'
  | 'APPLICATION_CREATED'
  | 'ERROR'
  // Web Page → Extension
  | 'GET_RESUME_LIST'
  | 'UPLOAD_RESUME'
  | 'SELECT_RESUME'
  | 'DELETE_RESUME'
  | 'TRIGGER_AUTOFILL'
  | 'DETECT_FORM'
  | 'GET_APPLICATIONS';

/**
 * Message Structure
 */
export interface Message<T = any> {
  type: MessageType;
  payload: T;
}

/**
 * Result Type for Operations
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };
