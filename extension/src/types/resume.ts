/**
 * Resume Type Definitions
 * 
 * This module contains comprehensive TypeScript interfaces for resume data structures.
 * All interfaces follow the JSON schema defined in the design document and support
 * the resume autofill extension's data model.
 * 
 * @module types/resume
 */

/**
 * Personal Information
 * 
 * Contains the candidate's basic contact and profile information.
 * Sensitive fields (phone, email) should be encrypted when stored.
 * 
 * @interface PersonalInfo
 * @property {string} name - Full name of the candidate (required)
 * @property {string} phone - Phone number, should be encrypted in storage (required)
 * @property {string} email - Email address, should be encrypted in storage (required)
 * @property {string} [address] - Physical address or current location (optional)
 * @property {string} [linkedin] - LinkedIn profile URL (optional)
 * @property {string} [github] - GitHub profile URL (optional)
 * @property {string} [portfolio] - Personal portfolio or website URL (optional)
 * 
 * @example
 * ```typescript
 * const personalInfo: PersonalInfo = {
 *   name: "张三",
 *   phone: "+86 138 0000 0000",
 *   email: "zhangsan@example.com",
 *   address: "北京市朝阳区",
 *   linkedin: "https://linkedin.com/in/zhangsan",
 *   github: "https://github.com/zhangsan",
 *   portfolio: "https://zhangsan.dev"
 * };
 * ```
 */
export interface PersonalInfo {
  name: string;
  phone: string;
  email: string;
  address?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

/**
 * Education Entry
 * 
 * Represents a single education record in the candidate's academic history.
 * Multiple entries should be stored in chronological order (most recent first).
 * 
 * @interface EducationEntry
 * @property {string} institution - Name of the educational institution (e.g., university, college)
 * @property {string} degree - Degree or qualification obtained (e.g., "Bachelor of Science", "硕士")
 * @property {string} major - Field of study or major (e.g., "Computer Science", "计算机科学")
 * @property {string} startDate - Start date in YYYY-MM format (e.g., "2018-09")
 * @property {string} endDate - End date in YYYY-MM format or "Present" for ongoing education
 * @property {string} [gpa] - Grade point average or academic performance indicator (optional)
 * @property {string[]} [achievements] - List of academic achievements, honors, or awards (optional)
 * 
 * @example
 * ```typescript
 * const education: EducationEntry = {
 *   institution: "清华大学",
 *   degree: "工学学士",
 *   major: "计算机科学与技术",
 *   startDate: "2018-09",
 *   endDate: "2022-06",
 *   gpa: "3.8/4.0",
 *   achievements: [
 *     "国家奖学金",
 *     "优秀毕业生"
 *   ]
 * };
 * ```
 */
export interface EducationEntry {
  institution: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  achievements?: string[];
}

/**
 * Work Experience Entry
 * 
 * Represents a single work experience record in the candidate's employment history.
 * Multiple entries should be stored in chronological order (most recent first).
 * 
 * @interface WorkEntry
 * @property {string} company - Name of the company or organization
 * @property {string} position - Job title or position held
 * @property {string} startDate - Start date in YYYY-MM format (e.g., "2022-07")
 * @property {string} endDate - End date in YYYY-MM format or "Present" for current position
 * @property {string} [location] - Work location (city, country, or "Remote") (optional)
 * @property {string[]} responsibilities - List of key responsibilities and duties
 * @property {string[]} [achievements] - List of notable achievements, metrics, or impact (optional)
 * 
 * @example
 * ```typescript
 * const workEntry: WorkEntry = {
 *   company: "字节跳动",
 *   position: "前端工程师",
 *   startDate: "2022-07",
 *   endDate: "Present",
 *   location: "北京",
 *   responsibilities: [
 *     "负责抖音主站前端开发",
 *     "优化页面性能，提升用户体验"
 *   ],
 *   achievements: [
 *     "将首屏加载时间减少30%",
 *     "主导重构核心组件库"
 *   ]
 * };
 * ```
 */
export interface WorkEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location?: string;
  responsibilities: string[];
  achievements?: string[];
}

/**
 * Project Entry
 * 
 * Represents a single project in the candidate's portfolio.
 * Can include personal projects, open-source contributions, or work projects.
 * 
 * @interface ProjectEntry
 * @property {string} name - Name of the project
 * @property {string} description - Brief description of the project and its purpose
 * @property {string} role - Candidate's role in the project (e.g., "Lead Developer", "Contributor")
 * @property {string} [startDate] - Project start date in YYYY-MM format (optional)
 * @property {string} [endDate] - Project end date in YYYY-MM format or "Present" for ongoing projects (optional)
 * @property {string[]} technologies - List of technologies, frameworks, and tools used
 * @property {string[]} highlights - Key features, achievements, or outcomes of the project
 * @property {string} [url] - URL to project demo, repository, or documentation (optional)
 * 
 * @example
 * ```typescript
 * const project: ProjectEntry = {
 *   name: "智能简历助手",
 *   description: "基于AI的简历优化和职位匹配平台",
 *   role: "全栈开发者",
 *   startDate: "2023-01",
 *   endDate: "2023-06",
 *   technologies: ["React", "TypeScript", "Node.js", "PostgreSQL"],
 *   highlights: [
 *     "实现智能简历解析功能",
 *     "集成GPT-4进行简历优化建议",
 *     "服务1000+用户"
 *   ],
 *   url: "https://github.com/username/resume-helper"
 * };
 * ```
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
 * 
 * Categorized collection of the candidate's skills and qualifications.
 * 
 * @interface Skills
 * @property {string[]} technical - Technical skills, programming languages, frameworks, and tools
 * @property {string[]} languages - Spoken/written languages with proficiency levels
 * @property {string[]} certifications - Professional certifications and licenses
 * 
 * @example
 * ```typescript
 * const skills: Skills = {
 *   technical: [
 *     "JavaScript/TypeScript",
 *     "React/Vue.js",
 *     "Node.js",
 *     "Python",
 *     "SQL/NoSQL"
 *   ],
 *   languages: [
 *     "中文 (母语)",
 *     "英语 (流利)",
 *     "日语 (基础)"
 *   ],
 *   certifications: [
 *     "AWS Certified Developer",
 *     "PMP项目管理专业人士"
 *   ]
 * };
 * ```
 */
export interface Skills {
  technical: string[];
  languages: string[];
  certifications: string[];
}

/**
 * Resume JSON
 * 
 * Complete structured representation of a resume.
 * This is the primary data model used throughout the extension for storing,
 * parsing, and autofilling resume information.
 * 
 * All resume data should conform to this schema to ensure compatibility
 * with the autofill engine and field mapping logic.
 * 
 * @interface ResumeJSON
 * @property {PersonalInfo} personalInfo - Candidate's personal and contact information
 * @property {EducationEntry[]} education - Array of education records, ordered chronologically (most recent first)
 * @property {WorkEntry[]} workExperience - Array of work experience records, ordered chronologically (most recent first)
 * @property {ProjectEntry[]} projects - Array of project records
 * @property {Skills} skills - Categorized skills and qualifications
 * @property {string} [summary] - Professional summary or objective statement (optional)
 * @property {Record<string, any>} [customFields] - Additional custom fields for extensibility (optional)
 * 
 * @example
 * ```typescript
 * const resume: ResumeJSON = {
 *   personalInfo: {
 *     name: "李明",
 *     phone: "+86 138 0000 0000",
 *     email: "liming@example.com",
 *     linkedin: "https://linkedin.com/in/liming"
 *   },
 *   education: [
 *     {
 *       institution: "北京大学",
 *       degree: "硕士",
 *       major: "软件工程",
 *       startDate: "2020-09",
 *       endDate: "2022-06",
 *       gpa: "3.9/4.0"
 *     }
 *   ],
 *   workExperience: [
 *     {
 *       company: "腾讯",
 *       position: "高级前端工程师",
 *       startDate: "2022-07",
 *       endDate: "Present",
 *       location: "深圳",
 *       responsibilities: ["负责微信小程序开发"],
 *       achievements: ["提升性能50%"]
 *     }
 *   ],
 *   projects: [
 *     {
 *       name: "开源UI组件库",
 *       description: "轻量级React组件库",
 *       role: "核心贡献者",
 *       technologies: ["React", "TypeScript"],
 *       highlights: ["1000+ GitHub stars"]
 *     }
 *   ],
 *   skills: {
 *     technical: ["JavaScript", "React", "Node.js"],
 *     languages: ["中文 (母语)", "英语 (流利)"],
 *     certifications: []
 *   },
 *   summary: "5年前端开发经验，专注于React生态系统"
 * };
 * ```
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
 * Resume Version
 * 
 * Represents a complete resume version with metadata and structured data.
 * Each resume version is a snapshot of resume information that can be used
 * for autofilling job application forms. Users can maintain multiple versions
 * tailored for different job types or companies.
 * 
 * The extension stores resume versions in browser localStorage with sensitive
 * fields (phone, email) encrypted for security. Each version has a unique
 * identifier and timestamps for tracking creation and modification.
 * 
 * @interface ResumeVersion
 * @property {string} id - Unique identifier for this resume version (UUID format)
 * @property {string} name - User-assigned name for easy identification (e.g., "Software Engineer Resume", "前端开发简历")
 * @property {string} fileName - Original filename of the uploaded resume file (e.g., "resume.pdf", "简历.docx")
 * @property {number} createdAt - Unix timestamp (milliseconds) when this version was created
 * @property {number} updatedAt - Unix timestamp (milliseconds) when this version was last modified
 * @property {ResumeJSON} data - Complete structured resume data conforming to ResumeJSON schema
 * @property {boolean} encrypted - Flag indicating whether sensitive fields (phone, email) are encrypted in storage
 * 
 * @example
 * ```typescript
 * // Creating a new resume version
 * const resumeVersion: ResumeVersion = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "软件工程师简历 - 互联网大厂",
 *   fileName: "resume_tech_2024.pdf",
 *   createdAt: 1704067200000, // 2024-01-01 00:00:00 UTC
 *   updatedAt: 1704067200000,
 *   encrypted: true,
 *   data: {
 *     personalInfo: {
 *       name: "王小明",
 *       phone: "+86 138 0000 0000", // Will be encrypted in storage
 *       email: "wangxiaoming@example.com", // Will be encrypted in storage
 *       address: "北京市海淀区",
 *       linkedin: "https://linkedin.com/in/wangxiaoming",
 *       github: "https://github.com/wangxiaoming"
 *     },
 *     education: [
 *       {
 *         institution: "清华大学",
 *         degree: "工学硕士",
 *         major: "计算机科学与技术",
 *         startDate: "2020-09",
 *         endDate: "2023-06",
 *         gpa: "3.9/4.0",
 *         achievements: ["国家奖学金", "优秀毕业生"]
 *       }
 *     ],
 *     workExperience: [
 *       {
 *         company: "字节跳动",
 *         position: "高级前端工程师",
 *         startDate: "2023-07",
 *         endDate: "Present",
 *         location: "北京",
 *         responsibilities: [
 *           "负责抖音主站前端架构设计与开发",
 *           "优化首屏加载性能，提升用户体验"
 *         ],
 *         achievements: [
 *           "将首屏加载时间减少40%",
 *           "主导微前端架构重构"
 *         ]
 *       }
 *     ],
 *     projects: [
 *       {
 *         name: "开源UI组件库",
 *         description: "轻量级、高性能的React组件库",
 *         role: "核心维护者",
 *         startDate: "2022-01",
 *         endDate: "Present",
 *         technologies: ["React", "TypeScript", "Rollup", "Storybook"],
 *         highlights: [
 *           "GitHub 2000+ stars",
 *           "npm 周下载量 10000+",
 *           "支持主题定制和国际化"
 *         ],
 *         url: "https://github.com/wangxiaoming/ui-components"
 *       }
 *     ],
 *     skills: {
 *       technical: [
 *         "JavaScript/TypeScript",
 *         "React/Vue.js",
 *         "Node.js",
 *         "Webpack/Vite",
 *         "Git"
 *       ],
 *       languages: ["中文 (母语)", "英语 (流利 - CET-6)"],
 *       certifications: ["AWS Certified Developer Associate"]
 *     },
 *     summary: "5年前端开发经验，专注于React生态系统和性能优化，有大型互联网公司项目经验"
 *   }
 * };
 * 
 * // Updating a resume version
 * const updatedVersion: ResumeVersion = {
 *   ...resumeVersion,
 *   name: "软件工程师简历 - 外企版",
 *   updatedAt: Date.now(),
 *   data: {
 *     ...resumeVersion.data,
 *     summary: "5 years of frontend development experience, specializing in React ecosystem and performance optimization"
 *   }
 * };
 * 
 * // Multiple versions for different job types
 * const versions: ResumeVersion[] = [
 *   {
 *     id: "uuid-1",
 *     name: "前端工程师 - 互联网",
 *     fileName: "frontend_internet.pdf",
 *     createdAt: Date.now(),
 *     updatedAt: Date.now(),
 *     encrypted: true,
 *     data: { /* ... frontend-focused content ... *\/ }
 *   },
 *   {
 *     id: "uuid-2",
 *     name: "全栈工程师 - 创业公司",
 *     fileName: "fullstack_startup.pdf",
 *     createdAt: Date.now(),
 *     updatedAt: Date.now(),
 *     encrypted: true,
 *     data: { /* ... fullstack-focused content ... *\/ }
 *   },
 *   {
 *     id: "uuid-3",
 *     name: "技术负责人 - 管理岗",
 *     fileName: "tech_lead.pdf",
 *     createdAt: Date.now(),
 *     updatedAt: Date.now(),
 *     encrypted: true,
 *     data: { /* ... leadership-focused content ... *\/ }
 *   }
 * ];
 * ```
 * 
 * @remarks
 * **Storage Considerations:**
 * - The extension SHALL store at least 10 ResumeVersion objects in browser localStorage (Requirement 1.1)
 * - Sensitive fields (personalInfo.phone, personalInfo.email) MUST be encrypted before storage (Requirement 9.6)
 * - Each version is stored with a unique key: `resume_${id}` in localStorage
 * 
 * **Timestamp Format:**
 * - Both createdAt and updatedAt use Unix timestamps in milliseconds (Date.now() format)
 * - This allows easy sorting and date calculations across different timezones
 * - Example: 1704067200000 represents 2024-01-01 00:00:00 UTC
 * 
 * **ID Generation:**
 * - IDs MUST be UUIDs (Universally Unique Identifiers) to prevent collisions
 * - Use crypto.randomUUID() or a UUID library for generation
 * - Format: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" (UUID v4)
 * 
 * **Name Guidelines:**
 * - Names should be descriptive and help users quickly identify the resume purpose
 * - Recommended format: "{Position} - {Target Company Type}" or "{职位} - {目标公司类型}"
 * - Examples: "Software Engineer - FAANG", "前端开发 - 互联网大厂", "Full Stack - Startup"
 * 
 * **Encryption:**
 * - When encrypted=true, personalInfo.phone and personalInfo.email are encrypted in the stored JSON
 * - Encryption happens before saving to localStorage, decryption happens after retrieval
 * - The data field in memory (after decryption) contains plaintext for autofill operations
 * 
 * **Usage in Extension:**
 * - Resume Manager stores and retrieves ResumeVersion objects from localStorage
 * - Management Panel displays all versions with their names and creation dates
 * - Autofill Engine uses the active ResumeVersion's data field to fill forms
 * - Application Tracker references resumeId to link application records to specific versions
 */
export interface ResumeVersion {
  id: string;
  name: string;
  fileName: string;
  createdAt: number;
  updatedAt: number;
  data: ResumeJSON;
  encrypted: boolean;
}
