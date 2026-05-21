# Implementation Plan: User Profile Sidebar

## Overview

This implementation plan breaks down the user profile sidebar feature into discrete coding tasks. The sidebar will be implemented using vanilla JavaScript, HTML, and CSS to match the existing codebase architecture. All data will be persisted using browser localStorage without backend dependencies.

The implementation follows a progressive approach: core structure → user info & resume list → upload integration → layout adjustments → polish & testing. Each task builds incrementally on previous work, with checkpoints to validate functionality.

## Tasks

- [x] 1. Set up core sidebar structure and storage utilities
  - Create HTML structure for profile sidebar with three sections (user info, resume list, upload area)
  - Implement StorageManager utility class for localStorage operations with validation
  - Add CSS variables for 樱花粉 (sakura pink) color scheme matching existing design
  - Create basic sidebar layout with fixed positioning on left side
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4_

- [ ]* 1.1 Write unit tests for StorageManager
  - Test data validation, serialization, and error handling
  - Test quota exceeded scenarios
  - Test data corruption recovery
  - _Requirements: 9.6_

- [x] 2. Implement sidebar expand/collapse functionality
  - [x] 2.1 Create toggle button with arrow icon
    - Add toggle button to sidebar with proper ARIA labels
    - Implement click handler to switch between expanded/collapsed states
    - Add CSS transitions for smooth 300ms animations using transforms
    - _Requirements: 1.6, 2.1, 2.2, 2.3_
  
  - [x] 2.2 Implement state persistence
    - Save sidebar state (expanded/collapsed) to localStorage on toggle
    - Restore sidebar state from localStorage on page load
    - Handle missing or invalid state data with defaults
    - _Requirements: 2.4, 2.5, 9.4, 9.5_
  
  - [x] 2.3 Add responsive behavior for collapsed state
    - Adjust sidebar width to 60px when collapsed
    - Show only arrow icon in collapsed state
    - Ensure smooth width transitions with GPU-accelerated transforms
    - _Requirements: 1.3, 2.6, 10.1_

- [ ] 3. Checkpoint - Verify sidebar toggle functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement user info section
  - [ ] 4.1 Create user avatar and name display
    - Add avatar placeholder with default image
    - Add editable user name field with contenteditable
    - Implement click handler for avatar upload
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 4.2 Implement user info editing and persistence
    - Add input validation and sanitization for user name (max 50 chars, strip HTML)
    - Implement avatar upload with file validation (image types, max 2MB)
    - Convert avatar to base64 and save to localStorage
    - Save user info changes to localStorage with debouncing (500ms)
    - _Requirements: 3.4, 3.5, 9.1, 9.5_
  
  - [ ] 4.3 Handle first-time user experience
    - Display default avatar and name "用户" when no data exists
    - Initialize user profile in localStorage on first interaction
    - _Requirements: 3.6, 7.1_

- [ ]* 4.4 Write unit tests for user info validation
  - Test name sanitization (HTML stripping, length limits)
  - Test avatar file validation (type, size)
  - Test base64 conversion
  - _Requirements: 3.4, 3.5_

- [ ] 5. Implement resume list display and management
  - [ ] 5.1 Create resume list rendering
    - Implement ResumeItem component to render individual resume entries
    - Display resume file name, upload time, and file size
    - Show active resume indicator (✓ mark)
    - Handle empty state with "还没有上传简历" message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 5.2 Implement resume list data management
    - Load resume list from localStorage on page load
    - Sort resumes by upload time (most recent first)
    - Update resume count display in section title
    - Handle scrolling for lists with 20+ resumes
    - _Requirements: 4.2, 9.2, 9.5, 11.5_
  
  - [ ] 5.3 Add resume selection functionality
    - Implement click handler for resume items
    - Update active resume indicator on selection
    - Save active resume ID to localStorage
    - _Requirements: 5.1, 5.4_

- [ ]* 5.4 Write integration tests for resume list
  - Test resume list rendering with 0, 1, 5, 20 items
  - Test resume selection and active state updates
  - Test localStorage persistence across page reloads
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 6. Checkpoint - Verify user info and resume list functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate upload functionality into sidebar
  - [x] 7.1 Move upload UI to sidebar upload area
    - Copy upload dropzone, file input, and button to sidebar
    - Maintain existing upload styling and樱花粉 theme
    - Add progress bar to sidebar upload area
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [x] 7.2 Implement file upload and validation
    - Validate file type (PDF, DOCX only)
    - Validate file size (max 5MB)
    - Display validation errors in sidebar
    - _Requirements: 11.2, 11.4_
  
  - [x] 7.3 Integrate with existing parse API
    - Generate UUID for new resume using crypto.randomUUID()
    - Create resume object with metadata (id, fileName, uploadTime, fileSize, fileType)
    - Call existing /upload API endpoint
    - Handle upload progress updates
    - _Requirements: 6.3, 6.6_
  
  - [x] 7.4 Update resume list on successful upload
    - Add new resume to resume list in localStorage
    - Set new resume as active resume
    - Update resume list display
    - Trigger result panel update with parse results
    - _Requirements: 6.3, 6.4, 9.2, 9.3_

- [ ]* 7.5 Write integration tests for upload flow
  - Test file validation (type, size)
  - Test resume list update after upload
  - Test active resume selection after upload
  - Test error handling for failed uploads
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 11.2, 11.4_

- [ ] 8. Implement resume switching and result display
  - [ ] 8.1 Load and display resume results
    - Implement function to load resume parse results from localStorage
    - Update MBTI section with resume data
    - Update job recommendations with resume data
    - Update diagnosis box with resume data
    - _Requirements: 5.2, 5.3_
  
  - [ ] 8.2 Handle resume switching transitions
    - Add fade-in/fade-out transitions for result panel updates
    - Ensure smooth transitions complete within 500ms
    - Display loading state during result updates
    - _Requirements: 5.5, 10.4_
  
  - [ ] 8.3 Handle edge cases
    - Handle switching to resume with no parse results
    - Handle switching when parse is in progress
    - Display appropriate error messages
    - _Requirements: 5.6, 11.3_

- [ ]* 8.4 Write integration tests for resume switching
  - Test result panel updates when switching resumes
  - Test transitions and loading states
  - Test error handling for missing or invalid data
  - _Requirements: 5.2, 5.3, 5.5, 5.6_

- [ ] 9. Implement first-time user experience
  - [ ] 9.1 Detect first-time users
    - Check localStorage for existing resume data
    - Set sidebar to expanded state for first-time users
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Implement auto-collapse after first upload
    - Detect when first resume upload completes
    - Automatically collapse sidebar with smooth animation
    - Save collapsed state to localStorage
    - _Requirements: 7.4_
  
  - [ ] 9.3 Handle initial UI state
    - Hide diagnosis box for first-time users
    - Show upload guidance text in upload area
    - Display placeholder content in result panel
    - _Requirements: 7.6, 7.3, 7.5_

- [ ] 10. Checkpoint - Verify upload and switching functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement layout adjustments and responsive design
  - [ ] 11.1 Create LayoutManager for coordinating layout changes
    - Implement LayoutManager class to handle sidebar and main content coordination
    - Add methods to adjust layout based on sidebar state
    - Handle CSS grid adjustments for main layout
    - _Requirements: 8.1_
  
  - [ ] 11.2 Implement diagnosis box expansion
    - Expand diagnosis box to fill left column space when sidebar collapses
    - Maintain diagnosis box in original position when sidebar expands
    - Add smooth transitions for diagnosis box size changes
    - _Requirements: 8.2, 10.6_
  
  - [ ] 11.3 Add desktop responsive behavior (>1024px)
    - Set sidebar expanded width to 20% (320px min, 400px max)
    - Set sidebar collapsed width to 60px
    - Adjust main content grid to accommodate sidebar
    - _Requirements: 8.4_
  
  - [ ] 11.4 Add tablet responsive behavior (768px - 1024px)
    - Set sidebar expanded width to 25% (280px min)
    - Adjust grid layout for tablet screens
    - _Requirements: 8.5_
  
  - [ ] 11.5 Add mobile responsive behavior (<768px)
    - Implement full-screen overlay mode for expanded sidebar
    - Add close button for mobile overlay
    - Keep 60px fixed left edge for collapsed state
    - Stack main content vertically on mobile
    - _Requirements: 8.6_

- [ ]* 11.6 Write visual regression tests for responsive layouts
  - Test sidebar at desktop, tablet, and mobile breakpoints
  - Test diagnosis box expansion/collapse
  - Test layout adjustments for different viewport sizes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 12. Implement animations and visual feedback
  - [ ] 12.1 Add sidebar transition animations
    - Use CSS transforms for GPU-accelerated animations
    - Implement cubic-bezier easing for smooth transitions
    - Add will-change property for performance
    - _Requirements: 10.1_
  
  - [ ] 12.2 Add hover and interaction feedback
    - Add hover effects for resume items (background color change)
    - Add click feedback animations for resume items
    - Add hover effects for buttons and interactive elements
    - _Requirements: 10.2, 10.3_
  
  - [ ] 12.3 Add progress and loading animations
    - Implement smooth progress bar animations for uploads
    - Add shimmer effect to progress bar
    - Add fade transitions for result panel updates
    - _Requirements: 10.5, 10.4_
  
  - [ ] 12.4 Optimize animation performance
    - Use requestAnimationFrame for layout updates
    - Batch DOM reads and writes to avoid layout thrashing
    - Debounce resize handlers
    - _Requirements: 12.2, 12.3_

- [ ] 13. Implement error handling and edge cases
  - [ ] 13.1 Handle localStorage quota exceeded
    - Catch QuotaExceededError exceptions
    - Display user-friendly error message
    - Suggest deleting old resumes
    - _Requirements: 11.1_
  
  - [ ] 13.2 Handle data corruption
    - Validate data structure when loading from localStorage
    - Reset to empty state if data is corrupted
    - Display warning message to user
    - _Requirements: 9.6_
  
  - [ ] 13.3 Handle active resume deletion
    - Detect when active resume is deleted
    - Automatically select most recent resume as new active
    - Clear results if no resumes remain
    - _Requirements: 11.6_
  
  - [ ] 13.4 Implement resume list size limit
    - Limit resume list to maximum 50 items
    - Remove oldest resume when limit is reached
    - Display notification when limit is reached
    - _Requirements: 12.4_

- [ ]* 13.5 Write integration tests for error handling
  - Test localStorage quota exceeded scenario
  - Test data corruption recovery
  - Test active resume deletion
  - Test resume list size limit
  - _Requirements: 11.1, 11.6, 9.6, 12.4_

- [ ] 14. Implement accessibility features
  - [ ] 14.1 Add ARIA labels and roles
    - Add aria-label to sidebar and toggle button
    - Add aria-expanded attribute to toggle button
    - Add role="complementary" to sidebar
    - Add role="list" and role="listitem" to resume list
    - _Requirements: 1.1, 1.6, 4.1_
  
  - [ ] 14.2 Implement keyboard navigation
    - Add tabindex to all interactive elements
    - Implement Enter/Space key handlers for resume items
    - Implement Escape key to close sidebar on mobile
    - Add focus styles for keyboard navigation
    - _Requirements: 2.1, 5.1_
  
  - [ ] 14.3 Add screen reader support
    - Add live region for state change announcements
    - Announce sidebar expand/collapse to screen readers
    - Announce resume selection changes
    - Add descriptive labels for all interactive elements
    - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [ ]* 14.4 Perform accessibility audit
  - Test keyboard navigation flow
  - Test screen reader compatibility (VoiceOver on Safari)
  - Verify ARIA labels and roles
  - Check color contrast ratios
  - _Requirements: 1.1, 1.6, 2.1, 4.1, 5.1_

- [ ] 15. Implement security and input sanitization
  - [ ] 15.1 Sanitize user name input
    - Strip HTML tags from user name
    - Limit user name length to 50 characters
    - Trim whitespace
    - _Requirements: 3.3, 3.4_
  
  - [ ] 15.2 Validate file uploads
    - Check file extension against whitelist (.pdf, .docx)
    - Verify MIME type matches extension
    - Enforce file size limit (5MB)
    - _Requirements: 11.2, 11.4_
  
  - [ ] 15.3 Validate localStorage data
    - Validate resume data structure on load
    - Validate UUID format for resume IDs
    - Validate data types for all fields
    - _Requirements: 9.6_
  
  - [ ] 15.4 Escape user content in DOM
    - Use textContent instead of innerHTML for user data
    - Escape HTML entities in resume file names
    - Prevent XSS through user-generated content
    - _Requirements: 3.3, 4.3_

- [ ]* 15.5 Write security tests
  - Test HTML injection prevention
  - Test file upload validation
  - Test localStorage data validation
  - _Requirements: 3.3, 3.4, 9.6, 11.2, 11.4_

- [ ] 16. Implement data migration and versioning
  - [ ] 16.1 Add schema version to localStorage
    - Store current schema version (1.0) in localStorage
    - Check version on page load
    - _Requirements: 9.5_
  
  - [ ] 16.2 Implement migration framework
    - Create migration function structure
    - Handle missing version (first-time users)
    - Prepare for future schema changes
    - _Requirements: 9.5_

- [ ] 17. Checkpoint - Verify all core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Integration and final wiring
  - [ ] 18.1 Wire sidebar to existing upload workflow
    - Ensure sidebar upload triggers existing parse logic
    - Maintain compatibility with existing result rendering
    - Verify diagnosis box updates correctly
    - _Requirements: 6.2, 6.3, 6.4, 6.6_
  
  - [ ] 18.2 Integrate with existing CSS variables
    - Reuse existing樱花粉 color variables
    - Match existing shadow and radius styles
    - Ensure consistent typography
    - _Requirements: 1.4_
  
  - [ ] 18.3 Test cross-browser compatibility
    - Test on Chrome/Edge 90+
    - Test on Safari 14+ (Mac - user's primary browser)
    - Test on Firefox 88+
    - Test on mobile Safari (iOS)
    - _Requirements: 12.1, 12.5_
  
  - [ ] 18.4 Add UUID polyfill for older browsers
    - Implement crypto.randomUUID() polyfill
    - Test UUID generation on older browsers
    - _Requirements: 9.2_

- [ ]* 18.5 Write end-to-end integration tests
  - Test complete upload → parse → display workflow
  - Test resume switching workflow
  - Test sidebar expand/collapse with layout adjustments
  - Test first-time user experience
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 19. Performance optimization
  - [ ] 19.1 Optimize localStorage operations
    - Implement lazy loading for resume parse results
    - Load only metadata on initial render
    - Load full parse results only when resume is selected
    - _Requirements: 12.2_
  
  - [ ] 19.2 Optimize animations
    - Use CSS transforms instead of layout properties
    - Add will-change hints for animated elements
    - Remove will-change after animations complete
    - _Requirements: 12.1, 12.3_
  
  - [ ] 19.3 Debounce expensive operations
    - Debounce user name save (500ms)
    - Debounce window resize handler (200ms)
    - Throttle scroll events if needed
    - _Requirements: 12.2, 12.3_

- [ ]* 19.4 Perform performance testing
  - Test with 50+ resumes in list
  - Measure animation frame rates
  - Test localStorage read/write performance
  - Profile memory usage
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20. Final polish and testing
  - [ ] 20.1 Add resume deletion functionality
    - Add delete button to resume items
    - Implement confirmation dialog
    - Handle active resume deletion gracefully
    - Update localStorage after deletion
    - _Requirements: 11.6_
  
  - [ ] 20.2 Add empty state handling
    - Display empty state when no resumes exist
    - Show appropriate messages in all sections
    - Guide user to upload first resume
    - _Requirements: 4.6, 7.2_
  
  - [ ] 20.3 Add loading states
    - Show loading indicator during parse
    - Show loading state during resume switching
    - Disable interactions during loading
    - _Requirements: 5.5, 6.5_
  
  - [ ] 20.4 Final visual polish
    - Verify all colors match樱花粉 theme
    - Check spacing and alignment
    - Verify hover states and transitions
    - Test on different screen sizes
    - _Requirements: 1.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 21. Final checkpoint - Complete testing and validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements from requirements.md for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Implementation uses vanilla JavaScript to match existing codebase architecture
- All data persistence uses browser localStorage (no backend required)
- Focus on Safari compatibility as user's primary browser is Safari on Mac
- Maintain existing樱花粉 (sakura pink) aesthetic throughout implementation
- Property-based tests are not included as this is primarily a UI/DOM manipulation feature
- Unit tests focus on utility functions (StorageManager, validation, sanitization)
- Integration tests focus on user workflows (upload, switch, delete)
- Visual regression tests ensure UI consistency across breakpoints
- Accessibility testing requires manual verification with screen readers

## Implementation Strategy

The implementation follows a layered approach:

1. **Foundation (Tasks 1-3)**: Core structure, storage utilities, and toggle functionality
2. **User Management (Tasks 4-6)**: User info section with editing and persistence
3. **Resume Management (Tasks 7-10)**: Upload integration, list management, and switching
4. **Layout & Responsive (Tasks 11)**: Layout coordination and responsive breakpoints
5. **Polish (Tasks 12-16)**: Animations, error handling, accessibility, security
6. **Integration (Tasks 17-19)**: Final wiring, compatibility, and performance
7. **Final Polish (Tasks 20-21)**: Edge cases, empty states, and comprehensive testing

Each phase builds on the previous one, with checkpoints to validate progress and gather user feedback before proceeding to the next phase.
