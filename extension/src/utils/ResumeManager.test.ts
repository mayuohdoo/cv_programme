/**
 * Resume Manager Unit Tests
 * 
 * Tests for ResumeManager class CRUD operations
 */

import { ResumeManager } from './ResumeManager';
import { ResumeVersion } from '../types/resume';

describe('ResumeManager', () => {
  let manager: ResumeManager;
  let storage: Map<string, string>;

  beforeEach(() => {
    // Create a fresh storage map for each test
    storage = new Map<string, string>();

    // Mock localStorage with proper isolation
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) || null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        length: 0,
        key: () => null
      },
      writable: true
    });

    // Create fresh manager instance
    manager = new ResumeManager();
  });

  afterEach(() => {
    storage.clear();
    jest.clearAllMocks();
  });

  // Helper function to create test resume data
  const createTestResumeData = (name: string = 'Test Resume'): Omit<ResumeVersion, 'id' | 'createdAt' | 'updatedAt'> => ({
    name,
    fileName: 'test-resume.pdf',
    encrypted: false,
    data: {
      personalInfo: {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      },
      education: [
        {
          institution: 'Test University',
          degree: 'Bachelor',
          major: 'Computer Science',
          startDate: '2018-09',
          endDate: '2022-06'
        }
      ],
      workExperience: [
        {
          company: 'Test Company',
          position: 'Software Engineer',
          startDate: '2022-07',
          endDate: 'Present',
          responsibilities: ['Develop features', 'Write tests']
        }
      ],
      projects: [],
      skills: {
        technical: ['JavaScript', 'TypeScript'],
        languages: ['English'],
        certifications: []
      }
    }
  });

  describe('storeResume', () => {
    it('should store a resume and return its ID', async () => {
      const resumeData = createTestResumeData();
      const result = await manager.storeResume(resumeData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeDefined();
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it('should generate unique IDs for different resumes', async () => {
      const resume1 = createTestResumeData('Resume 1');
      const resume2 = createTestResumeData('Resume 2');

      const result1 = await manager.storeResume(resume1);
      const result2 = await manager.storeResume(resume2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        expect(result1.value).not.toBe(result2.value);
      }
    });

    it('should add timestamps when storing', async () => {
      const resumeData = createTestResumeData();
      const beforeStore = Date.now();
      
      const result = await manager.storeResume(resumeData);
      
      const afterStore = Date.now();

      expect(result.success).toBe(true);
      if (result.success) {
        const stored = await manager.getResume(result.value);
        expect(stored).not.toBeNull();
        if (stored) {
          expect(stored.createdAt).toBeGreaterThanOrEqual(beforeStore);
          expect(stored.createdAt).toBeLessThanOrEqual(afterStore);
          expect(stored.updatedAt).toBe(stored.createdAt);
        }
      }
    });

    it('should handle quota exceeded error', async () => {
      // Save original implementation
      const originalSetItem = localStorage.setItem;
      
      // Mock quota exceeded error
      localStorage.setItem = jest.fn(() => {
        const error: any = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const resumeData = createTestResumeData();
      const result = await manager.storeResume(resumeData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('QUOTA_EXCEEDED');
        expect(result.error.recoverable).toBe(true);
      }

      // Restore original implementation
      localStorage.setItem = originalSetItem;
    });

    it('should handle storage disabled error', async () => {
      // Save original implementation
      const originalSetItem = localStorage.setItem;
      
      // Mock security error
      localStorage.setItem = jest.fn(() => {
        const error: any = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      const resumeData = createTestResumeData();
      const result = await manager.storeResume(resumeData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('STORAGE_DISABLED');
        expect(result.error.recoverable).toBe(false);
      }

      // Restore original implementation
      localStorage.setItem = originalSetItem;
    });
  });

  describe('getResumes', () => {
    it('should return empty array when no resumes stored', async () => {
      const resumes = await manager.getResumes();
      expect(resumes).toEqual([]);
    });

    it('should return all stored resumes', async () => {
      const resume1 = createTestResumeData('Resume 1');
      const resume2 = createTestResumeData('Resume 2');
      const resume3 = createTestResumeData('Resume 3');

      await manager.storeResume(resume1);
      await manager.storeResume(resume2);
      await manager.storeResume(resume3);

      const resumes = await manager.getResumes();

      expect(resumes.length).toBe(3);
      expect(resumes.map(r => r.name)).toContain('Resume 1');
      expect(resumes.map(r => r.name)).toContain('Resume 2');
      expect(resumes.map(r => r.name)).toContain('Resume 3');
    });

    it('should preserve all resume data', async () => {
      const resumeData = createTestResumeData('Test Resume');
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      const resumes = await manager.getResumes();

      expect(resumes.length).toBe(1);
      expect(resumes[0]?.name).toBe(resumeData.name);
      expect(resumes[0]?.fileName).toBe(resumeData.fileName);
      expect(resumes[0]?.data).toEqual(resumeData.data);
    });
  });

  describe('getResume', () => {
    it('should return null for non-existent ID', async () => {
      const resume = await manager.getResume('non-existent-id');
      expect(resume).toBeNull();
    });

    it('should retrieve a specific resume by ID', async () => {
      const resumeData = createTestResumeData('Specific Resume');
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const retrieved = await manager.getResume(storeResult.value);
        expect(retrieved).not.toBeNull();
        if (retrieved) {
          expect(retrieved.id).toBe(storeResult.value);
          expect(retrieved.name).toBe('Specific Resume');
        }
      }
    });

    it('should return null for corrupted data', async () => {
      // Manually insert corrupted data
      storage.set('resume_corrupted', 'invalid json {');
      storage.set('resume_index', JSON.stringify(['corrupted']));

      const resume = await manager.getResume('corrupted');
      expect(resume).toBeNull();
    });
  });

  describe('updateResume', () => {
    it('should update resume name', async () => {
      const resumeData = createTestResumeData('Original Name');
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const updateResult = await manager.updateResume(storeResult.value, {
          name: 'Updated Name'
        });

        expect(updateResult.success).toBe(true);

        const updated = await manager.getResume(storeResult.value);
        expect(updated?.name).toBe('Updated Name');
      }
    });

    it('should update updatedAt timestamp', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const original = await manager.getResume(storeResult.value);
        
        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        await manager.updateResume(storeResult.value, {
          name: 'Updated'
        });

        const updated = await manager.getResume(storeResult.value);
        
        expect(updated?.updatedAt).toBeGreaterThan(original!.createdAt);
      }
    });

    it('should not change createdAt timestamp', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const original = await manager.getResume(storeResult.value);
        const originalCreatedAt = original!.createdAt;

        await manager.updateResume(storeResult.value, {
          name: 'Updated'
        });

        const updated = await manager.getResume(storeResult.value);
        expect(updated?.createdAt).toBe(originalCreatedAt);
      }
    });

    it('should not change ID', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const originalId = storeResult.value;

        await manager.updateResume(originalId, {
          name: 'Updated'
        } as any);

        const updated = await manager.getResume(originalId);
        expect(updated?.id).toBe(originalId);
      }
    });

    it('should return error for non-existent resume', async () => {
      const result = await manager.updateResume('non-existent', {
        name: 'Updated'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('deleteResume', () => {
    it('should delete a resume', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const deleteResult = await manager.deleteResume(storeResult.value);
        expect(deleteResult.success).toBe(true);

        const retrieved = await manager.getResume(storeResult.value);
        expect(retrieved).toBeNull();
      }
    });

    it('should remove resume from list', async () => {
      const resume1 = createTestResumeData('Resume 1');
      const resume2 = createTestResumeData('Resume 2');

      const result1 = await manager.storeResume(resume1);
      const result2 = await manager.storeResume(resume2);

      expect(result1.success && result2.success).toBe(true);

      if (result1.success) {
        await manager.deleteResume(result1.value);

        const resumes = await manager.getResumes();
        expect(resumes.length).toBe(1);
        expect(resumes[0]?.name).toBe('Resume 2');
      }
    });

    it('should return error for non-existent resume', async () => {
      const result = await manager.deleteResume('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should clear active resume if deleted', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        await manager.setActiveResume(storeResult.value);
        
        const activeBeforeDelete = await manager.getActiveResumeId();
        expect(activeBeforeDelete).toBe(storeResult.value);

        await manager.deleteResume(storeResult.value);

        const activeAfterDelete = await manager.getActiveResumeId();
        expect(activeAfterDelete).toBeNull();
      }
    });
  });

  describe('setActiveResume and getActiveResume', () => {
    it('should set and get active resume', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      expect(storeResult.success).toBe(true);

      if (storeResult.success) {
        const setResult = await manager.setActiveResume(storeResult.value);
        expect(setResult.success).toBe(true);

        const activeId = await manager.getActiveResumeId();
        expect(activeId).toBe(storeResult.value);

        const activeResume = await manager.getActiveResume();
        expect(activeResume?.id).toBe(storeResult.value);
      }
    });

    it('should return null when no active resume set', async () => {
      const activeId = await manager.getActiveResumeId();
      expect(activeId).toBeNull();

      const activeResume = await manager.getActiveResume();
      expect(activeResume).toBeNull();
    });

    it('should return error when setting non-existent resume as active', async () => {
      const result = await manager.setActiveResume('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should update active resume when changed', async () => {
      const resume1 = createTestResumeData('Resume 1');
      const resume2 = createTestResumeData('Resume 2');

      const result1 = await manager.storeResume(resume1);
      const result2 = await manager.storeResume(resume2);

      expect(result1.success && result2.success).toBe(true);

      if (result1.success && result2.success) {
        await manager.setActiveResume(result1.value);
        let active = await manager.getActiveResume();
        expect(active?.name).toBe('Resume 1');

        await manager.setActiveResume(result2.value);
        active = await manager.getActiveResume();
        expect(active?.name).toBe('Resume 2');
      }
    });
  });

  describe('clearAll', () => {
    it('should clear all resumes', async () => {
      const resume1 = createTestResumeData('Resume 1');
      const resume2 = createTestResumeData('Resume 2');

      await manager.storeResume(resume1);
      await manager.storeResume(resume2);

      let resumes = await manager.getResumes();
      expect(resumes.length).toBe(2);

      const clearResult = await manager.clearAll();
      expect(clearResult.success).toBe(true);

      resumes = await manager.getResumes();
      expect(resumes.length).toBe(0);
    });

    it('should clear active resume', async () => {
      const resumeData = createTestResumeData();
      const storeResult = await manager.storeResume(resumeData);

      if (storeResult.success) {
        await manager.setActiveResume(storeResult.value);
        
        await manager.clearAll();

        const activeId = await manager.getActiveResumeId();
        expect(activeId).toBeNull();
      }
    });
  });
});
