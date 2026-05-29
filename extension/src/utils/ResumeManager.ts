/**
 * Resume Manager
 * 
 * Manages resume versions in browser localStorage with CRUD operations.
 * Handles storage, retrieval, updates, and deletion of resume versions.
 * 
 * @module utils/ResumeManager
 */

import { ResumeVersion } from '../types/resume';
import { Result } from '../types';

/**
 * Storage Error Types
 */
export interface StorageError {
  type: 'QUOTA_EXCEEDED' | 'STORAGE_DISABLED' | 'CORRUPTION' | 'NOT_FOUND' | 'INVALID_DATA';
  message: string;
  recoverable: boolean;
}

/**
 * Resume Manager Class
 * 
 * Provides methods for managing resume versions in browser localStorage.
 * Implements Requirements 1.1, 1.3, 1.4, 1.5, 1.6
 */
export class ResumeManager {
  private readonly STORAGE_PREFIX = 'resume_';
  private readonly ACTIVE_RESUME_KEY = 'active_resume_id';
  private readonly RESUME_INDEX_KEY = 'resume_index';

  /**
   * Generate a UUID v4
   * @returns UUID string
   */
  private generateUUID(): string {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback implementation for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get current timestamp in milliseconds
   * @returns Unix timestamp
   */
  private getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Get resume index (list of all resume IDs)
   * @returns Array of resume IDs
   */
  private getResumeIndex(): string[] {
    try {
      const indexData = localStorage.getItem(this.RESUME_INDEX_KEY);
      if (!indexData) {
        return [];
      }
      return JSON.parse(indexData);
    } catch (error) {
      console.error('Failed to parse resume index:', error);
      return [];
    }
  }

  /**
   * Update resume index
   * @param index - Array of resume IDs
   */
  private setResumeIndex(index: string[]): void {
    try {
      localStorage.setItem(this.RESUME_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update resume index:', error);
      throw error;
    }
  }

  /**
   * Add resume ID to index
   * @param id - Resume ID to add
   */
  private addToIndex(id: string): void {
    const index = this.getResumeIndex();
    if (!index.includes(id)) {
      index.push(id);
      this.setResumeIndex(index);
    }
  }

  /**
   * Remove resume ID from index
   * @param id - Resume ID to remove
   */
  private removeFromIndex(id: string): void {
    const index = this.getResumeIndex();
    const filteredIndex = index.filter(resumeId => resumeId !== id);
    this.setResumeIndex(filteredIndex);
  }

  /**
   * Store a new resume version
   * 
   * Validates: Requirements 1.1, 1.3
   * 
   * @param resume - Resume data without id, createdAt, updatedAt
   * @returns Resume ID on success, error on failure
   */
  async storeResume(resume: Omit<ResumeVersion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<string, StorageError>> {
    try {
      // Generate unique ID and timestamps
      const id = this.generateUUID();
      const timestamp = this.getCurrentTimestamp();

      const resumeVersion: ResumeVersion = {
        id,
        name: resume.name,
        fileName: resume.fileName,
        createdAt: timestamp,
        updatedAt: timestamp,
        data: resume.data,
        encrypted: resume.encrypted
      };

      // Serialize and store
      const serialized = JSON.stringify(resumeVersion);
      const storageKey = `${this.STORAGE_PREFIX}${id}`;
      
      localStorage.setItem(storageKey, serialized);
      
      // Update index
      this.addToIndex(id);

      return { success: true, value: id };
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: {
            type: 'QUOTA_EXCEEDED',
            message: '存储空间不足，请删除一些旧简历',
            recoverable: true
          }
        };
      }

      if (error.name === 'SecurityError') {
        return {
          success: false,
          error: {
            type: 'STORAGE_DISABLED',
            message: '浏览器存储已禁用，请检查隐私设置',
            recoverable: false
          }
        };
      }

      return {
        success: false,
        error: {
          type: 'CORRUPTION',
          message: '存储失败，请重试',
          recoverable: true
        }
      };
    }
  }

  /**
   * Get all stored resumes
   * 
   * Validates: Requirements 1.1, 1.5
   * 
   * @returns Array of all resume versions
   */
  async getResumes(): Promise<ResumeVersion[]> {
    const index = this.getResumeIndex();
    const resumes: ResumeVersion[] = [];

    for (const id of index) {
      const result = await this.getResume(id);
      if (result) {
        resumes.push(result);
      }
    }

    return resumes;
  }

  /**
   * Get a specific resume by ID
   * 
   * Validates: Requirements 1.5
   * 
   * @param id - Resume ID
   * @returns Resume version or null if not found
   */
  async getResume(id: string): Promise<ResumeVersion | null> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${id}`;
      const data = localStorage.getItem(storageKey);

      if (!data) {
        return null;
      }

      const resume: ResumeVersion = JSON.parse(data);
      
      // Validate structure
      if (!resume.id || !resume.name || !resume.data) {
        console.error('Invalid resume structure:', resume);
        return null;
      }

      return resume;
    } catch (error) {
      console.error('Failed to retrieve resume:', error);
      return null;
    }
  }

  /**
   * Update resume metadata (name, data, etc.)
   * 
   * Validates: Requirements 1.4
   * 
   * @param id - Resume ID
   * @param updates - Partial resume data to update
   * @returns Success or error
   */
  async updateResume(
    id: string,
    updates: Partial<Omit<ResumeVersion, 'id' | 'createdAt'>>
  ): Promise<Result<void, StorageError>> {
    try {
      const existing = await this.getResume(id);

      if (!existing) {
        return {
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: '简历不存在',
            recoverable: false
          }
        };
      }

      // Merge updates with existing data
      const updated: ResumeVersion = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID cannot be changed
        createdAt: existing.createdAt, // Ensure createdAt cannot be changed
        updatedAt: this.getCurrentTimestamp()
      };

      // Store updated version
      const storageKey = `${this.STORAGE_PREFIX}${id}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      return { success: true, value: undefined };
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: {
            type: 'QUOTA_EXCEEDED',
            message: '存储空间不足',
            recoverable: true
          }
        };
      }

      return {
        success: false,
        error: {
          type: 'CORRUPTION',
          message: '更新失败，请重试',
          recoverable: true
        }
      };
    }
  }

  /**
   * Delete a resume
   * 
   * Validates: Requirements 1.6
   * 
   * @param id - Resume ID
   * @returns Success or error
   */
  async deleteResume(id: string): Promise<Result<void, StorageError>> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${id}`;
      
      // Check if resume exists
      const exists = localStorage.getItem(storageKey);
      if (!exists) {
        return {
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: '简历不存在',
            recoverable: false
          }
        };
      }

      // Remove from storage
      localStorage.removeItem(storageKey);
      
      // Remove from index
      this.removeFromIndex(id);

      // If this was the active resume, clear active resume
      const activeId = await this.getActiveResumeId();
      if (activeId === id) {
        localStorage.removeItem(this.ACTIVE_RESUME_KEY);
      }

      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'CORRUPTION',
          message: '删除失败，请重试',
          recoverable: true
        }
      };
    }
  }

  /**
   * Set active resume
   * 
   * @param id - Resume ID to set as active
   * @returns Success or error
   */
  async setActiveResume(id: string): Promise<Result<void, StorageError>> {
    try {
      // Verify resume exists
      const resume = await this.getResume(id);
      if (!resume) {
        return {
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: '简历不存在',
            recoverable: false
          }
        };
      }

      localStorage.setItem(this.ACTIVE_RESUME_KEY, id);
      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_DISABLED',
          message: '无法设置活动简历',
          recoverable: false
        }
      };
    }
  }

  /**
   * Get active resume ID
   * 
   * @returns Active resume ID or null
   */
  async getActiveResumeId(): Promise<string | null> {
    try {
      return localStorage.getItem(this.ACTIVE_RESUME_KEY);
    } catch (error) {
      console.error('Failed to get active resume ID:', error);
      return null;
    }
  }

  /**
   * Get active resume
   * 
   * @returns Active resume version or null
   */
  async getActiveResume(): Promise<ResumeVersion | null> {
    const activeId = await this.getActiveResumeId();
    if (!activeId) {
      return null;
    }
    return this.getResume(activeId);
  }

  /**
   * Clear all resumes (for testing or user data deletion)
   * 
   * @returns Success or error
   */
  async clearAll(): Promise<Result<void, StorageError>> {
    try {
      const index = this.getResumeIndex();
      
      // Remove all resume data
      for (const id of index) {
        const storageKey = `${this.STORAGE_PREFIX}${id}`;
        localStorage.removeItem(storageKey);
      }

      // Clear index and active resume
      localStorage.removeItem(this.RESUME_INDEX_KEY);
      localStorage.removeItem(this.ACTIVE_RESUME_KEY);

      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'CORRUPTION',
          message: '清除失败',
          recoverable: true
        }
      };
    }
  }
}

// Export singleton instance
export const resumeManager = new ResumeManager();
