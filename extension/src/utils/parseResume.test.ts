/**
 * Unit Tests for Resume Text-to-JSON Parsing Module
 * 
 * These tests verify the resume parsing functionality including:
 * - Section detection (Personal Info, Education, Experience, Projects, Skills)
 * - Field extraction for all resume sections
 * - Date parsing and normalization
 * - Email validation and phone normalization
 * - Error handling for missing or invalid data
 * - Edge cases (empty sections, malformed data, etc.)
 * 
 * @module utils/parseResume.test
 */

import { parseResume } from './parseResume';

describe('Resume Text-to-JSON Parsing', () => {
  describe('parseResume', () => {
    it('should parse a complete resume with all sections', async () => {
      const resumeText = `
John Doe
Phone: +1 (555) 123-4567
Email: john.doe@example.com
Address: San Francisco, CA
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe
Portfolio: https://johndoe.dev

Education
Stanford University
Bachelor of Science in Computer Science
2016-09 to 2020-06
GPA: 3.8/4.0
• Dean's List
• National Merit Scholar

Work Experience
Google Inc.
Senior Software Engineer
2020-07 to Present
Mountain View, CA
• Led development of search ranking algorithms
• Improved query performance by 40%
• Mentored 5 junior engineers

Projects
Open Source UI Library
A lightweight React component library
Role: Core Maintainer
2021-01 to Present
Technologies: React, TypeScript, Rollup
• 2000+ GitHub stars
• 10000+ weekly npm downloads
https://github.com/johndoe/ui-library

Skills
Technical Skills: JavaScript, TypeScript, React, Node.js, Python
Languages: English (Native), Spanish (Fluent)
Certifications: AWS Certified Developer

Summary
5 years of software engineering experience specializing in web technologies and distributed systems.
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        const resume = result.value;

        // Verify personal info
        expect(resume.personalInfo.name).toBe('John Doe');
        expect(resume.personalInfo.phone).toBe('+15551234567');
        expect(resume.personalInfo.email).toBe('john.doe@example.com');
        expect(resume.personalInfo.address).toBe('San Francisco, CA');
        expect(resume.personalInfo.linkedin).toBe('https://linkedin.com/in/johndoe');
        expect(resume.personalInfo.github).toBe('https://github.com/johndoe');
        expect(resume.personalInfo.portfolio).toBe('https://johndoe.dev');

        // Verify education
        expect(resume.education).toHaveLength(1);
        expect(resume.education[0]?.institution).toBe('Stanford University');
        expect(resume.education[0]?.degree).toContain('Bachelor');
        expect(resume.education[0]?.major).toContain('Computer Science');
        expect(resume.education[0]?.startDate).toBe('2016-09');
        expect(resume.education[0]?.endDate).toBe('2020-06');
        expect(resume.education[0]?.gpa).toBe('3.8/4.0');
        expect(resume.education[0]?.achievements).toContain('Dean\'s List');

        // Verify work experience
        expect(resume.workExperience).toHaveLength(1);
        expect(resume.workExperience[0]?.company).toBe('Google Inc.');
        expect(resume.workExperience[0]?.position).toContain('Senior Software Engineer');
        expect(resume.workExperience[0]?.startDate).toBe('2020-07');
        expect(resume.workExperience[0]?.endDate).toBe('Present');
        expect(resume.workExperience[0]?.location).toBe('Mountain View, CA');
        expect(resume.workExperience[0]?.responsibilities).toContain('Led development of search ranking algorithms');
        expect(resume.workExperience[0]?.achievements).toContain('Improved query performance by 40%');

        // Verify projects
        expect(resume.projects).toHaveLength(1);
        expect(resume.projects[0]?.name).toBe('Open Source UI Library');
        expect(resume.projects[0]?.description).toContain('React component library');
        expect(resume.projects[0]?.role).toBe('Core Maintainer');
        expect(resume.projects[0]?.technologies).toContain('React');
        expect(resume.projects[0]?.technologies).toContain('TypeScript');
        expect(resume.projects[0]?.highlights).toContain('2000+ GitHub stars');
        expect(resume.projects[0]?.url).toBe('https://github.com/johndoe/ui-library');

        // Verify skills
        expect(resume.skills.technical).toContain('JavaScript');
        expect(resume.skills.technical).toContain('TypeScript');
        expect(resume.skills.languages).toContain('English (Native)');
        expect(resume.skills.certifications).toContain('AWS Certified Developer');

        // Verify summary
        expect(resume.summary).toContain('5 years of software engineering experience');
      }
    });

    it('should parse Chinese resume format', async () => {
      const resumeText = `
张三
电话：+86 138 0000 0000
邮箱：zhangsan@example.com
地址：北京市海淀区
领英：linkedin.com/in/zhangsan

教育经历
清华大学
工学硕士，计算机科学与技术
2020年9月 - 2023年6月
GPA: 3.9/4.0

工作经历
字节跳动
高级前端工程师
2023年7月 - 至今
北京
• 负责抖音主站前端开发
• 优化首屏加载时间减少40%

技能
专业技能：JavaScript, React, Vue.js, Node.js
语言：中文（母语），英语（流利）
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        const resume = result.value;

        expect(resume.personalInfo.name).toBe('张三');
        expect(resume.personalInfo.phone).toBe('+8613800000000');
        expect(resume.personalInfo.email).toBe('zhangsan@example.com');

        expect(resume.education).toHaveLength(1);
        expect(resume.education[0]?.institution).toBe('清华大学');
        expect(resume.education[0]?.startDate).toBe('2020-09');
        expect(resume.education[0]?.endDate).toBe('2023-06');

        expect(resume.workExperience).toHaveLength(1);
        expect(resume.workExperience[0]?.company).toBe('字节跳动');
        expect(resume.workExperience[0]?.endDate).toBe('Present');

        expect(resume.skills.technical).toContain('JavaScript');
        expect(resume.skills.languages).toContain('中文（母语）');
      }
    });

    it('should handle missing optional fields', async () => {
      const resumeText = `
Jane Smith
Email: jane@example.com
Phone: 555-1234

Education
MIT
Bachelor in Computer Science
2018-09 to 2022-06

Work Experience
Tech Corp
Software Engineer
2022-07 to Present
• Developed web applications

Skills
JavaScript, Python
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        const resume = result.value;

        // Required fields present
        expect(resume.personalInfo.name).toBe('Jane Smith');
        expect(resume.personalInfo.email).toBe('jane@example.com');
        expect(resume.personalInfo.phone).toBe('5551234');

        // Optional fields missing
        expect(resume.personalInfo.address).toBeUndefined();
        expect(resume.personalInfo.linkedin).toBeUndefined();
        expect(resume.personalInfo.github).toBeUndefined();

        // Education without GPA
        expect(resume.education[0]?.gpa).toBeUndefined();
        expect(resume.education[0]?.achievements).toBeUndefined();

        // Work experience without location
        expect(resume.workExperience[0]?.location).toBeUndefined();
        expect(resume.workExperience[0]?.achievements).toBeUndefined();
      }
    });

    it('should return error for empty text', async () => {
      const result = await parseResume('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_TEXT');
        expect(result.error.message).toContain('empty');
      }
    });

    it('should return error for whitespace-only text', async () => {
      const result = await parseResume('   \n\n   \t\t   ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_TEXT');
      }
    });

    it('should return error when missing required fields', async () => {
      const resumeText = `
Some random text without proper structure
Education
Some University
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('MISSING_REQUIRED_FIELDS');
        expect(result.error.message).toContain('name, email, phone');
      }
    });

    it('should extract name from first line when no label present', async () => {
      const resumeText = `
Alice Johnson
alice.johnson@example.com
+1-555-9876

Education
Harvard University
Master of Science
2019-09 to 2021-06

Work Experience
Amazon
Software Development Engineer
2021-07 to Present
• Built scalable microservices
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.personalInfo.name).toBe('Alice Johnson');
        expect(result.value.personalInfo.email).toBe('alice.johnson@example.com');
        expect(result.value.personalInfo.phone).toBe('+15559876');
      }
    });

    it('should normalize phone numbers correctly', async () => {
      const testCases = [
        { input: '+1 (555) 123-4567', expected: '+15551234567' },
        { input: '555-123-4567', expected: '5551234567' },
        { input: '+86 138 0000 0000', expected: '+8613800000000' },
        { input: '(123) 456-7890', expected: '1234567890' }
      ];

      for (const testCase of testCases) {
        const resumeText = `
Test User
Email: test@example.com
Phone: ${testCase.input}

Education
Test University
Bachelor
2020-09 to 2024-06

Work Experience
Test Company
Engineer
2024-07 to Present
• Test responsibility
        `.trim();

        const result = await parseResume(resumeText);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.personalInfo.phone).toBe(testCase.expected);
        }
      }
    });

    it('should validate email addresses', async () => {
      const validEmail = `
Test User
Email: valid.email@example.com
Phone: 555-1234

Education
Test University
Bachelor
2020-09 to 2024-06

Work Experience
Test Company
Engineer
2024-07 to Present
• Test responsibility
      `.trim();

      const result = await parseResume(validEmail);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.personalInfo.email).toBe('valid.email@example.com');
      }
    });

    it('should parse multiple education entries', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Stanford University
Master of Science in Computer Science
2020-09 to 2022-06
GPA: 3.9/4.0

UC Berkeley
Bachelor of Arts in Mathematics
2016-09 to 2020-06
GPA: 3.7/4.0

Work Experience
Test Company
Engineer
2022-07 to Present
• Test responsibility
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.education).toHaveLength(2);
        expect(result.value.education[0]?.institution).toBe('Stanford University');
        expect(result.value.education[0]?.degree).toContain('Master');
        expect(result.value.education[1]?.institution).toBe('UC Berkeley');
        expect(result.value.education[1]?.degree).toContain('Bachelor');
      }
    });

    it('should parse multiple work experience entries', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Current Company
Senior Engineer
2022-01 to Present
• Current responsibility

Previous Company
Engineer
2020-07 to 2021-12
• Previous responsibility
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.workExperience).toHaveLength(2);
        expect(result.value.workExperience[0]?.company).toBe('Current Company');
        expect(result.value.workExperience[0]?.position).toContain('Senior Engineer');
        expect(result.value.workExperience[1]?.company).toBe('Previous Company');
      }
    });

    it('should parse multiple project entries', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility

Projects
Project One
First project description
Role: Lead Developer
Technologies: React, Node.js
• Feature 1
• Feature 2

Project Two
Second project description
Role: Contributor
Technologies: Python, Django
• Feature A
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.projects).toHaveLength(2);
        expect(result.value.projects[0]?.name).toBe('Project One');
        expect(result.value.projects[0]?.role).toBe('Lead Developer');
        expect(result.value.projects[0]?.technologies).toContain('React');
        expect(result.value.projects[1]?.name).toBe('Project Two');
      }
    });

    it('should handle various date formats', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
University A
Bachelor
Sep 2016 to Jun 2020

University B
Master
2020-09 to 2022-06

Work Experience
Company A
Engineer
September 2022 to Present
• Responsibility

Company B
Developer
2020年7月 to 2022年8月
• Responsibility
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.education[0]?.startDate).toBe('2016-09');
        expect(result.value.education[0]?.endDate).toBe('2020-06');
        expect(result.value.education[1]?.startDate).toBe('2020-09');
        expect(result.value.education[1]?.endDate).toBe('2022-06');
        expect(result.value.workExperience[0]?.endDate).toBe('Present');
        expect(result.value.workExperience[1]?.startDate).toBe('2020-07');
        expect(result.value.workExperience[1]?.endDate).toBe('2022-08');
      }
    });

    it('should handle skills with different formats', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility

Skills
JavaScript, TypeScript, React, Node.js
Languages: English (Native), Spanish (Fluent), French (Basic)
Certifications: AWS Certified Developer, Google Cloud Professional
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.skills.technical).toContain('JavaScript');
        expect(result.value.skills.technical).toContain('TypeScript');
        expect(result.value.skills.technical).toContain('React');
        expect(result.value.skills.languages).toContain('English (Native)');
        expect(result.value.skills.languages).toContain('Spanish (Fluent)');
        expect(result.value.skills.certifications).toContain('AWS Certified Developer');
        expect(result.value.skills.certifications).toContain('Google Cloud Professional');
      }
    });

    it('should normalize URLs to include protocol', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234
LinkedIn: linkedin.com/in/testuser
GitHub: github.com/testuser
Portfolio: testuser.dev

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.personalInfo.linkedin).toBe('https://linkedin.com/in/testuser');
        expect(result.value.personalInfo.github).toBe('https://github.com/testuser');
        expect(result.value.personalInfo.portfolio).toBe('https://testuser.dev');
      }
    });

    it('should handle resume without projects section', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility

Skills
JavaScript, Python
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.projects).toHaveLength(0);
      }
    });

    it('should handle resume without summary section', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility

Skills
JavaScript, Python
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.summary).toBeUndefined();
      }
    });

    it('should extract achievements from work experience', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Senior Engineer
2020-07 to Present
• Led team of 5 developers
• Improved system performance by 50%
• Reduced deployment time by 30%
• Mentored junior engineers
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        const work = result.value.workExperience[0];
        expect(work).toBeDefined();
        expect(work?.achievements).toBeDefined();
        expect(work?.achievements?.some(a => a.includes('50%'))).toBe(true);
        expect(work?.achievements?.some(a => a.includes('30%'))).toBe(true);
      }
    });

    it('should handle empty sections gracefully', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

Education
Test University
Bachelor
2016-09 to 2020-06

Work Experience
Test Company
Engineer
2020-07 to Present
• Test responsibility

Projects

Skills
JavaScript, Python
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.projects).toHaveLength(0);
        expect(result.value.skills.technical).toContain('JavaScript');
      }
    });

    it('should handle malformed section headers', async () => {
      const resumeText = `
Test User
Email: test@example.com
Phone: 555-1234

EDUCATION BACKGROUND
Test University
Bachelor of Science
2016-09 to 2020-06

PROFESSIONAL EXPERIENCE
Test Company
Software Engineer
2020-07 to Present
• Developed applications

TECHNICAL SKILLS
JavaScript, TypeScript, React
      `.trim();

      const result = await parseResume(resumeText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.education).toHaveLength(1);
        expect(result.value.workExperience).toHaveLength(1);
        expect(result.value.skills.technical).toContain('JavaScript');
      }
    });
  });
});
