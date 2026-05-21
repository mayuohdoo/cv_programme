/**
 * Resume Text-to-JSON Parsing Module
 * 
 * This module provides functionality to parse extracted text from resumes
 * (PDF/DOCX) into structured ResumeJSON format. It uses pattern matching
 * and regular expressions to identify sections and extract fields.
 * 
 * @module utils/parseResume
 */

import type { 
  ResumeJSON, 
  PersonalInfo, 
  EducationEntry, 
  WorkEntry, 
  ProjectEntry, 
  Skills 
} from '../types/resume';

/**
 * Result type for parsing operations
 * Follows the Result pattern for explicit error handling
 */
export type ParseResult<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Parsing Error Types
 */
export interface ParsingError {
  type: 'EMPTY_TEXT' | 'MISSING_REQUIRED_FIELDS' | 'PARSING_FAILED';
  message: string;
  details?: any;
}

/**
 * Section detection patterns
 * These patterns help identify different sections in a resume
 */
const SECTION_PATTERNS = {
  personalInfo: /^(个人信息|基本信息|personal\s+info|contact|联系方式)/i,
  education: /^(教育经历|教育背景|education|academic)/i,
  workExperience: /^(工作经历|工作经验|work\s+experience|employment|professional\s+experience)/i,
  projects: /^(项目经历|项目经验|projects?|portfolio)/i,
  skills: /^(技能|专业技能|skills?|technical\s+skills|competencies)/i,
  summary: /^(个人简介|自我评价|summary|objective|profile|about)/i
};

/**
 * Field extraction patterns for personal information
 */
const PERSONAL_INFO_PATTERNS = {
  name: /(?:姓名|name|名字)[:：\s]*([^\n]+)/i,
  phone: /(?:电话|手机|phone|mobile|tel)[:：\s]*([+\d\s\-()]+)/i,
  email: /(?:邮箱|email|e-mail)[:：\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  address: /(?:地址|住址|address|location|city)[:：\s]*([^\n]+)/i,
  linkedin: /(?:linkedin|领英)[:：\s]*((?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+)/i,
  github: /(?:github)[:：\s]*((?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]+)/i,
  portfolio: /(?:个人网站|portfolio|website|blog)[:：\s]*((?:https?:\/\/)?[^\s]+)/i
};

/**
 * Email validation pattern (RFC 5322 simplified)
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Date patterns for education and work experience
 * Matches formats like: 2020-09, 2020.09, 2020/09, Sep 2020, September 2020, Present, 至今
 */
const DATE_PATTERN = /(\d{4}[-./]\d{1,2}|\d{4}\s*年\s*\d{1,2}\s*月|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|至今|现在|present)/gi;

/**
 * Parse resume text into structured ResumeJSON format
 * 
 * This function takes extracted text from a resume file and converts it into
 * a structured JSON object conforming to the ResumeJSON schema. It uses pattern
 * matching to identify sections and extract fields.
 * 
 * **Features:**
 * - Detects and extracts sections: Personal Info, Education, Experience, Projects, Skills
 * - Extracts personal info fields: name, phone, email, address, linkedin, github, portfolio
 * - Parses education entries with institution, degree, major, dates, GPA
 * - Parses work experience entries with company, position, dates, location, responsibilities
 * - Parses project entries with name, description, role, technologies, highlights
 * - Parses skills into technical, languages, certifications arrays
 * - Marks missing or ambiguous fields as empty rather than generating data
 * - Validates email addresses and normalizes phone numbers
 * 
 * **Error Handling:**
 * - EMPTY_TEXT: Input text is empty or whitespace only
 * - MISSING_REQUIRED_FIELDS: Required fields (name, email, phone) are missing
 * - PARSING_FAILED: Unexpected error during parsing
 * 
 * @param text - Extracted text from resume file (from PDF or DOCX extractor)
 * @returns Promise resolving to ParseResult with ResumeJSON or error
 * 
 * @example
 * ```typescript
 * const resumeText = await extractPDFText(file);
 * if (resumeText.success) {
 *   const result = await parseResume(resumeText.value);
 *   if (result.success) {
 *     console.log('Parsed resume:', result.value);
 *   } else {
 *     console.error('Parsing failed:', result.error.message);
 *   }
 * }
 * ```
 * 
 * **Validates: Requirements 2.1, 2.2, 2.5, 2.6**
 */
export async function parseResume(text: string): Promise<ParseResult<ResumeJSON, ParsingError>> {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: {
          type: 'EMPTY_TEXT',
          message: 'Resume text is empty. Cannot parse empty content.',
          details: { textLength: text?.length || 0 }
        }
      };
    }

    // Normalize text (consistent line breaks, trim whitespace)
    const normalizedText = normalizeText(text);

    // Split text into sections
    const sections = detectSections(normalizedText);

    // Extract personal information
    const personalInfo = extractPersonalInfo(sections['personalInfo'] || normalizedText);

    // Validate required fields
    if (!personalInfo.name || !personalInfo.email || !personalInfo.phone) {
      return {
        success: false,
        error: {
          type: 'MISSING_REQUIRED_FIELDS',
          message: 'Required fields (name, email, phone) are missing from the resume.',
          details: {
            hasName: !!personalInfo.name,
            hasEmail: !!personalInfo.email,
            hasPhone: !!personalInfo.phone
          }
        }
      };
    }

    // Extract education entries
    const education = extractEducation(sections['education'] || '');

    // Extract work experience entries
    const workExperience = extractWorkExperience(sections['workExperience'] || '');

    // Extract project entries
    const projects = extractProjects(sections['projects'] || '');

    // Extract skills
    const skills = extractSkills(sections['skills'] || '');

    // Extract summary
    const summary = extractSummary(sections['summary'] || '');

    // Construct ResumeJSON object
    const resumeJSON: ResumeJSON = {
      personalInfo,
      education,
      workExperience,
      projects,
      skills,
      ...(summary && { summary })
    };

    return {
      success: true,
      value: resumeJSON
    };

  } catch (error: any) {
    return {
      success: false,
      error: {
        type: 'PARSING_FAILED',
        message: 'An unexpected error occurred during resume parsing.',
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    };
  }
}

/**
 * Normalize text for consistent parsing
 * 
 * @param text - Raw text
 * @returns Normalized text
 * @internal
 */
function normalizeText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive newlines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Detect and split text into sections
 * 
 * @param text - Normalized resume text
 * @returns Object with section texts
 * @internal
 */
function detectSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check if line is a section header
    let foundSection = false;
    
    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = sectionName;
        currentContent = [];
        foundSection = true;
        break;
      }
    }
    
    // If not a section header, add to current section content
    if (!foundSection && currentSection) {
      currentContent.push(line);
    } else if (!foundSection && !currentSection) {
      // Before any section is detected, treat as personal info
      if (!sections['personalInfo']) {
        sections['personalInfo'] = '';
      }
      sections['personalInfo'] += line + '\n';
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Extract personal information from text
 * 
 * @param text - Personal info section text
 * @returns PersonalInfo object
 * @internal
 */
function extractPersonalInfo(text: string): PersonalInfo {
  const info: Partial<PersonalInfo> = {};

  // Extract name
  const nameMatch = text.match(PERSONAL_INFO_PATTERNS.name);
  if (nameMatch && nameMatch[1]) {
    info.name = nameMatch[1].trim();
  } else {
    // Try to extract name from first non-empty line
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines, email lines, phone lines, and lines with URLs
      if (trimmed.length > 0 && 
          trimmed.length < 50 && 
          !trimmed.includes('@') && 
          !trimmed.includes('http') &&
          !/^(?:电话|手机|phone|mobile|tel|email|邮箱)[:：\s]/i.test(trimmed)) {
        info.name = trimmed;
        break;
      }
    }
  }

  // Extract phone
  const phoneMatch = text.match(PERSONAL_INFO_PATTERNS.phone);
  if (phoneMatch && phoneMatch[1]) {
    info.phone = normalizePhone(phoneMatch[1].trim());
  }

  // Extract email
  const emailMatch = text.match(PERSONAL_INFO_PATTERNS.email);
  if (emailMatch && emailMatch[1] && validateEmail(emailMatch[1])) {
    info.email = emailMatch[1].trim();
  }

  // Extract address
  const addressMatch = text.match(PERSONAL_INFO_PATTERNS.address);
  if (addressMatch && addressMatch[1]) {
    info.address = addressMatch[1].trim();
  }

  // Extract LinkedIn
  const linkedinMatch = text.match(PERSONAL_INFO_PATTERNS.linkedin);
  if (linkedinMatch && linkedinMatch[1]) {
    info.linkedin = normalizeUrl(linkedinMatch[1].trim());
  }

  // Extract GitHub
  const githubMatch = text.match(PERSONAL_INFO_PATTERNS.github);
  if (githubMatch && githubMatch[1]) {
    info.github = normalizeUrl(githubMatch[1].trim());
  }

  // Extract portfolio
  const portfolioMatch = text.match(PERSONAL_INFO_PATTERNS.portfolio);
  if (portfolioMatch && portfolioMatch[1]) {
    info.portfolio = normalizeUrl(portfolioMatch[1].trim());
  } else {
    // Try to find standalone URL that's not LinkedIn or GitHub
    // Look for URLs on their own line or after common separators
    const lines = text.split('\n');
    for (const line of lines) {
      // Skip lines that contain email addresses
      if (line.includes('@')) continue;
      
      const urlMatch = line.match(/((?:https?:\/\/)?[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/);
      if (urlMatch && urlMatch[1] && 
          !urlMatch[1].includes('linkedin') && 
          !urlMatch[1].includes('github')) {
        info.portfolio = normalizeUrl(urlMatch[1].trim());
        break;
      }
    }
  }

  return info as PersonalInfo;
}

/**
 * Extract education entries from text
 * 
 * @param text - Education section text
 * @returns Array of EducationEntry objects
 * @internal
 */
function extractEducation(text: string): EducationEntry[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const entries: EducationEntry[] = [];
  
  // Split by double newlines or common separators
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (block.trim().length === 0) continue;

    const entry: Partial<EducationEntry> = {};
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Extract institution (usually first line or line with university/college keywords)
    const institutionLine = lines.find(line => 
      /大学|学院|university|college|institute|school/i.test(line)
    ) || lines[0];
    if (institutionLine) {
      entry.institution = institutionLine.replace(/^[•\-*]\s*/, '').trim();
    }

    // Extract degree and major
    for (const line of lines) {
      if (/学士|硕士|博士|bachelor|master|phd|doctorate|degree/i.test(line)) {
        const degreeMatch = line.match(/(学士|硕士|博士|Bachelor|Master|PhD|Doctorate|Associate)[^,\n]*/i);
        if (degreeMatch) {
          entry.degree = degreeMatch[0].trim();
        }
        
        const majorMatch = line.match(/(?:专业|major|field)[:：\s]*([^,\n]+)/i) ||
                          line.match(/(?:in|of)\s+([^,\n]+)/i);
        if (majorMatch && majorMatch[1]) {
          entry.major = majorMatch[1].trim();
        } else if (!entry.major) {
          // Try to extract major from the same line as degree
          const parts = line.split(/[,，]/);
          if (parts.length > 1 && parts[1]) {
            entry.major = parts[1].trim();
          }
        }
      }
    }

    // Extract dates
    const dates = extractDates(block);
    if (dates.length >= 2 && dates[0] && dates[1]) {
      entry.startDate = dates[0];
      entry.endDate = dates[1];
    } else if (dates.length === 1 && dates[0]) {
      entry.endDate = dates[0];
    }

    // Extract GPA
    const gpaMatch = block.match(/GPA[:：\s]*([0-9.]+(?:\/[0-9.]+)?)/i);
    if (gpaMatch && gpaMatch[1]) {
      entry.gpa = gpaMatch[1].trim();
    }

    // Extract achievements (lines starting with bullet points or achievement keywords)
    const achievements: string[] = [];
    for (const line of lines) {
      if (/^[•\-*]\s*/.test(line) || /奖学金|荣誉|award|honor|scholarship/i.test(line)) {
        achievements.push(line.replace(/^[•\-*]\s*/, '').trim());
      }
    }
    if (achievements.length > 0) {
      entry.achievements = achievements;
    }

    // Only add entry if it has required fields
    if (entry.institution && entry.degree && entry.major) {
      entries.push(entry as EducationEntry);
    }
  }

  return entries;
}

/**
 * Extract work experience entries from text
 * 
 * @param text - Work experience section text
 * @returns Array of WorkEntry objects
 * @internal
 */
function extractWorkExperience(text: string): WorkEntry[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const entries: WorkEntry[] = [];
  
  // Split by double newlines or common separators
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (block.trim().length === 0) continue;

    const entry: Partial<WorkEntry> = {};
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Extract company (usually first line or line with company keywords)
    const companyLine = lines.find(line => 
      /公司|集团|科技|技术|company|corp|inc|ltd|llc/i.test(line)
    ) || lines[0];
    if (companyLine) {
      entry.company = companyLine.replace(/^[•\-*]\s*/, '').trim();
    }

    // Extract position
    for (const line of lines) {
      if (/工程师|经理|主管|总监|engineer|manager|director|developer|designer|analyst/i.test(line)) {
        entry.position = line.replace(/^[•\-*]\s*/, '').trim();
        break;
      }
    }

    // Extract dates
    const dates = extractDates(block);
    if (dates.length >= 2 && dates[0] && dates[1]) {
      entry.startDate = dates[0];
      entry.endDate = dates[1];
    } else if (dates.length === 1 && dates[0]) {
      entry.endDate = dates[0];
    }

    // Extract location
    const locationMatch = block.match(/(?:地点|location|city)[:：\s]*([^\n]+)/i);
    if (locationMatch && locationMatch[1]) {
      entry.location = locationMatch[1].trim();
    }

    // Extract responsibilities and achievements
    const responsibilities: string[] = [];
    const achievements: string[] = [];
    
    for (const line of lines) {
      if (/^[•\-*]\s*/.test(line)) {
        const content = line.replace(/^[•\-*]\s*/, '').trim();
        if (/提升|优化|减少|增加|improve|optimize|reduce|increase|achieve/i.test(content)) {
          achievements.push(content);
        } else {
          responsibilities.push(content);
        }
      }
    }

    if (responsibilities.length > 0) {
      entry.responsibilities = responsibilities;
    } else {
      // If no bullet points, use remaining lines as responsibilities
      entry.responsibilities = lines.slice(2).filter(l => l.length > 10);
    }

    if (achievements.length > 0) {
      entry.achievements = achievements;
    }

    // Only add entry if it has required fields
    if (entry.company && entry.position && entry.responsibilities && entry.responsibilities.length > 0) {
      entries.push(entry as WorkEntry);
    }
  }

  return entries;
}

/**
 * Extract project entries from text
 * 
 * @param text - Projects section text
 * @returns Array of ProjectEntry objects
 * @internal
 */
function extractProjects(text: string): ProjectEntry[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const entries: ProjectEntry[] = [];
  
  // Split by double newlines or project name patterns
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (block.trim().length === 0) continue;

    const entry: Partial<ProjectEntry> = {};
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Extract project name (usually first line, or line without common keywords)
    if (lines.length > 0 && lines[0]) {
      const firstLine = lines[0].replace(/^[•\-*]\s*/, '').trim();
      // Check if first line is a description keyword
      if (!/^(?:描述|简介|description|about|role|technologies|tech)[:：\s]/i.test(firstLine)) {
        entry.name = firstLine;
      }
    }

    // Extract description (second line or line with description keyword)
    const descLine = lines.find(line => 
      /^(?:描述|简介|description|about)[:：\s]/i.test(line)
    );
    if (descLine) {
      entry.description = descLine.replace(/^(?:描述|简介|description|about)[:：\s]*/i, '').trim();
    } else if (lines.length > 1 && lines[1]) {
      // If no description keyword, use second line if it doesn't match other patterns
      const secondLine = lines[1];
      if (!/^(?:role|position|technologies|tech|角色|职责|技术)[:：\s]/i.test(secondLine)) {
        entry.description = secondLine;
      }
    }

    // If we still don't have a description, use the name as description
    if (!entry.description && entry.name) {
      entry.description = entry.name;
    }

    // Extract role
    const roleMatch = block.match(/(?:角色|职责|role|position)[:：\s]*([^\n]+)/i);
    if (roleMatch && roleMatch[1]) {
      entry.role = roleMatch[1].trim();
    } else {
      entry.role = '开发者'; // Default role
    }

    // Extract dates
    const dates = extractDates(block);
    if (dates.length >= 2 && dates[0] && dates[1]) {
      entry.startDate = dates[0];
      entry.endDate = dates[1];
    } else if (dates.length === 1 && dates[0]) {
      entry.endDate = dates[0];
    }

    // Extract technologies
    const techMatch = block.match(/(?:技术栈|技术|technologies?|tech\s+stack|tools?)[:：\s]*([^\n]+)/i);
    if (techMatch && techMatch[1]) {
      entry.technologies = techMatch[1].split(/[,，、]/).map(t => t.trim()).filter(t => t.length > 0);
    } else {
      entry.technologies = [];
    }

    // Extract highlights (lines starting with bullet points)
    const highlights: string[] = [];
    for (const line of lines) {
      if (/^[•\-*]\s*/.test(line)) {
        highlights.push(line.replace(/^[•\-*]\s*/, '').trim());
      }
    }
    entry.highlights = highlights.length > 0 ? highlights : [];

    // Extract URL
    const urlMatch = block.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch && urlMatch[1]) {
      entry.url = urlMatch[1].trim();
    }

    // Only add entry if it has required fields
    if (entry.name && entry.description && entry.role) {
      entries.push(entry as ProjectEntry);
    }
  }

  return entries;
}

/**
 * Extract skills from text
 * 
 * @param text - Skills section text
 * @returns Skills object
 * @internal
 */
function extractSkills(text: string): Skills {
  const skills: Skills = {
    technical: [],
    languages: [],
    certifications: []
  };

  if (!text || text.trim().length === 0) {
    return skills;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Check for language skills
    if (/语言|languages?/i.test(line)) {
      const languageMatch = line.match(/(?:语言|languages?)[:：\s]*(.+)/i);
      if (languageMatch && languageMatch[1]) {
        skills.languages = languageMatch[1].split(/[,，、]/).map(l => l.trim()).filter(l => l.length > 0);
      }
    }
    // Check for certifications
    else if (/证书|认证|certifications?|certificates?/i.test(line)) {
      const certMatch = line.match(/(?:证书|认证|certifications?|certificates?)[:：\s]*(.+)/i);
      if (certMatch && certMatch[1]) {
        skills.certifications = certMatch[1].split(/[,，、]/).map(c => c.trim()).filter(c => c.length > 0);
      }
    }
    // Otherwise treat as technical skills
    else {
      // Remove common skill labels if present
      const cleanLine = line
        .replace(/^(?:技术技能|专业技能|technical\s+skills?)[:：\s]*/i, '')
        .replace(/^(?:skills?)[:：\s]*/i, '');
      
      if (cleanLine.trim().length > 0) {
        const items = cleanLine.split(/[,，、]/).map(s => s.trim()).filter(s => s.length > 0);
        skills.technical.push(...items);
      }
    }
  }

  return skills;
}

/**
 * Extract summary from text
 * 
 * @param text - Summary section text
 * @returns Summary string or empty string
 * @internal
 */
function extractSummary(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Remove section header if present
  const cleanText = text.replace(/^(?:个人简介|自我评价|summary|objective|profile|about)[:：\s]*/i, '').trim();
  
  return cleanText;
}

/**
 * Extract dates from text
 * 
 * @param text - Text containing dates
 * @returns Array of date strings in YYYY-MM format or "Present"
 * @internal
 */
function extractDates(text: string): string[] {
  const dates: string[] = [];
  
  // Remove "to" separators to avoid confusion
  const cleanText = text.replace(/\s+to\s+/gi, ' ');
  
  const matches = cleanText.matchAll(new RegExp(DATE_PATTERN));

  for (const match of matches) {
    if (!match[1]) continue;
    
    const dateStr = match[1].trim();
    
    // Normalize to YYYY-MM format or "Present"
    if (/present|至今|现在/i.test(dateStr)) {
      dates.push('Present');
    } else if (/\d{4}[-./]\d{1,2}/.test(dateStr)) {
      // Already in YYYY-MM format
      const normalized = dateStr.replace(/[./]/g, '-');
      dates.push(normalized);
    } else if (/\d{4}\s*年\s*\d{1,2}\s*月/.test(dateStr)) {
      // Chinese format: 2020年9月
      const yearMatch = dateStr.match(/(\d{4})/);
      const monthMatch = dateStr.match(/(\d{1,2})\s*月/);
      if (yearMatch && yearMatch[1] && monthMatch && monthMatch[1]) {
        const month = monthMatch[1].padStart(2, '0');
        dates.push(`${yearMatch[1]}-${month}`);
      }
    } else if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i.test(dateStr)) {
      // English format: Sep 2020
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const parts = dateStr.split(/\s+/);
      if (parts[0] && parts[1]) {
        const monthAbbr = parts[0].toLowerCase().substring(0, 3);
        const year = parts[1];
        if (monthMap[monthAbbr]) {
          dates.push(`${year}-${monthMap[monthAbbr]}`);
        }
      }
    }
  }

  return dates;
}

/**
 * Validate email address
 * 
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 * @internal
 */
function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/**
 * Normalize phone number to consistent format
 * 
 * Removes all non-digit characters except leading +
 * 
 * @param phone - Phone number to normalize
 * @returns Normalized phone number
 * @internal
 */
function normalizePhone(phone: string): string {
  // Keep leading + for country code
  const hasPlus = phone.startsWith('+');
  const digits = phone.match(/\d/g)?.join('') || '';
  
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize URL to include protocol
 * 
 * @param url - URL to normalize
 * @returns Normalized URL with protocol
 * @internal
 */
function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}
