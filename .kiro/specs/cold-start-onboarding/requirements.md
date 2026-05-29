# Requirements Document

## Introduction

Cold-start onboarding flow for first-time users visiting the career guidance website (小小求职拿下). When a new user arrives, a full-screen guided overlay walks them through profile setup and personality preference questions. The answers are used to infer an MBTI personality type, which drives initial job recommendations. This personality-based MBTI is stored separately from the resume-parsed MBTI, enabling comparison and dual-track recommendations when both are available.

Target audience: college students exploring career direction. The tone is light, fun, and approachable — not a formal psychological assessment.

## Glossary

- **Onboarding_Overlay**: The full-screen modal overlay that appears on first visit, containing the guided onboarding steps
- **Profile_Step**: Step 1 of onboarding where the user sets up avatar and nickname (~10 seconds)
- **Personality_Step**: Step 2 of onboarding where the user answers 5–6 lifestyle preference questions (~1 minute)
- **Personality_MBTI**: The 4-letter MBTI type inferred from the user's answers to personality questions (stored in localStorage as `personalityMBTI`)
- **Resume_MBTI**: The 4-letter MBTI type derived from resume parsing (already implemented in the existing system)
- **Question_Card**: A card-style multiple-choice UI element presenting one personality preference question
- **Onboarding_Flag**: A boolean value stored in localStorage (`onboardingDone`) indicating the user has completed onboarding
- **StorageManager**: The existing utility class for localStorage operations used throughout the website
- **Sakura_Theme**: The existing design system using cherry blossom pink (樱花粉) color palette with CSS variables `--sakura-primary`, `--sakura-light`, etc.
- **Retake_Button**: A sidebar UI element allowing users to retake the personality test after initial completion
- **Alignment_Insight**: The comparison message shown when both Personality_MBTI and Resume_MBTI are available

## Requirements

### Requirement 1: Onboarding Trigger on First Visit

**User Story:** As a first-time visitor, I want to see a guided onboarding flow, so that I can set up my profile and get personalized recommendations immediately.

#### Acceptance Criteria

1. WHEN a user loads the website AND the Onboarding_Flag is not set in localStorage, THE Onboarding_Overlay SHALL display as a full-screen modal blocking access to the main interface
2. WHEN a user loads the website AND the Onboarding_Flag is set to true in localStorage, THE Onboarding_Overlay SHALL not appear and the main interface SHALL load normally
3. THE Onboarding_Overlay SHALL use a z-index higher than all existing page elements to ensure full-screen coverage

### Requirement 2: Profile Setup Step

**User Story:** As a new user, I want to quickly set up my avatar and nickname, so that I have a personalized identity on the platform.

#### Acceptance Criteria

1. WHEN the Onboarding_Overlay is displayed, THE Profile_Step SHALL appear as the first step showing an avatar upload area and a nickname text input
2. WHEN the user uploads an avatar image, THE Profile_Step SHALL display a preview of the selected image
3. WHEN the user enters a nickname and confirms, THE Profile_Step SHALL save the avatar and nickname to localStorage using the existing StorageManager with the `userProfile` key
4. WHEN the user has not provided a nickname, THE Profile_Step SHALL disable the continue button to prevent advancing without a nickname
5. WHEN the user skips the avatar upload, THE Profile_Step SHALL use a default avatar and allow the user to proceed with only a nickname

### Requirement 3: Personality Preference Questions

**User Story:** As a new user, I want to answer fun lifestyle questions, so that the system can understand my personality and recommend suitable career paths.

#### Acceptance Criteria

1. WHEN the user completes the Profile_Step, THE Personality_Step SHALL display 5–6 Question_Cards in sequence, one at a time
2. THE Question_Cards SHALL present lifestyle preference questions covering the four MBTI dimensions: E/I (social preference), T/F (decision-making style), J/P (planning preference), S/N (information processing preference), plus 1–2 additional signal-strengthening questions
3. WHEN a Question_Card is displayed, THE Personality_Step SHALL show 2–4 multiple-choice options in a card-style layout with visual selection feedback
4. WHEN the user selects an option on a Question_Card, THE Personality_Step SHALL advance to the next question with a smooth transition animation
5. WHEN the user has answered all questions, THE Personality_Step SHALL calculate the Personality_MBTI based on the weighted answers for each dimension
6. THE Question_Cards SHALL use casual, conversational language appropriate for college students (not formal psychological assessment language)

### Requirement 4: Personality Data Storage

**User Story:** As a user, I want my personality test results stored separately from my resume analysis, so that both data sources can be compared later.

#### Acceptance Criteria

1. WHEN the Personality_Step is completed, THE StorageManager SHALL save the calculated Personality_MBTI to localStorage under the key `personalityMBTI`
2. WHEN the Personality_Step is completed, THE StorageManager SHALL save the individual question answers to localStorage under the key `personalityAnswers`
3. WHEN the Personality_Step is completed, THE StorageManager SHALL set the Onboarding_Flag (`onboardingDone`) to true in localStorage
4. THE Personality_MBTI storage SHALL remain independent from the Resume_MBTI storage so both values can coexist

### Requirement 5: Post-Onboarding Transition

**User Story:** As a user who just completed onboarding, I want to see an initial personality-based job recommendation, so that I immediately get value from the onboarding process.

#### Acceptance Criteria

1. WHEN the user completes all onboarding steps, THE Onboarding_Overlay SHALL dismiss with a smooth fade-out animation revealing the main interface
2. WHEN the Onboarding_Overlay dismisses, THE main interface SHALL display an initial job recommendation based on the calculated Personality_MBTI
3. WHEN the initial recommendation is shown, THE main interface SHALL display the user's MBTI type with its Chinese name (from the existing MBTI_NAMES mapping) and a brief personality description

### Requirement 6: MBTI Alignment Comparison

**User Story:** As a user who has both personality test results and resume analysis, I want to see how they compare, so that I can understand the gap between my personality and my experience.

#### Acceptance Criteria

1. WHEN both Personality_MBTI and Resume_MBTI are available AND they match, THE Alignment_Insight SHALL display a positive message: "你的性格和经验高度一致 ✓"
2. WHEN both Personality_MBTI and Resume_MBTI are available AND they differ, THE Alignment_Insight SHALL display an insight message explaining the difference (e.g., "你的性格偏向 [Personality_MBTI type name]（创意型），但经验显示 [Resume_MBTI type name]（执行型）。也许可以探索更符合性格的方向？")
3. WHEN both MBTI types are available AND they differ, THE main interface SHALL provide two sets of job recommendations: experience-based recommendations (labeled as easier to get offers) and personality-based recommendations (labeled as potentially more fulfilling)
4. WHEN only Personality_MBTI is available, THE main interface SHALL show only personality-based recommendations without comparison

### Requirement 7: Retake Personality Test

**User Story:** As a returning user, I want to retake the personality test, so that I can update my results if my preferences have changed.

#### Acceptance Criteria

1. THE sidebar SHALL display a Retake_Button labeled "重新测试性格" visible to users who have completed onboarding
2. WHEN the user clicks the Retake_Button, THE Onboarding_Overlay SHALL reopen showing only the Personality_Step (skipping the Profile_Step)
3. WHEN the user completes the retake, THE StorageManager SHALL overwrite the existing Personality_MBTI and personalityAnswers with the new results
4. WHEN the retake is completed, THE main interface SHALL refresh recommendations based on the updated Personality_MBTI

### Requirement 8: Visual Design Consistency

**User Story:** As a user, I want the onboarding flow to match the existing website design, so that the experience feels cohesive and polished.

#### Acceptance Criteria

1. THE Onboarding_Overlay SHALL use the existing Sakura_Theme CSS variables (--sakura-primary, --sakura-light, --sakura-lighter, --sakura-dark, --sakura-gradient)
2. THE Question_Cards SHALL use rounded corners (--radius or --radius-lg), soft shadows (--shadow-sakura), and the sakura gradient background
3. THE Onboarding_Overlay SHALL be responsive, adapting layout for desktop (>1024px), tablet (768px–1024px), and mobile (<768px) viewports
4. THE Onboarding_Overlay SHALL include subtle animations (fade-in, slide transitions between steps) consistent with the existing website interaction patterns

### Requirement 9: Progress Indication

**User Story:** As a user going through onboarding, I want to see my progress, so that I know how many steps remain.

#### Acceptance Criteria

1. WHILE the user is in the Onboarding_Overlay, THE Onboarding_Overlay SHALL display a progress indicator showing the current step number and total steps
2. WHEN the user advances to the next question in the Personality_Step, THE progress indicator SHALL update to reflect the current question number out of total questions
3. THE progress indicator SHALL use a visual bar or dot-style indicator matching the Sakura_Theme

### Requirement 10: Accessibility

**User Story:** As a user with accessibility needs, I want the onboarding flow to be navigable with keyboard and screen readers, so that I can complete it without barriers.

#### Acceptance Criteria

1. THE Onboarding_Overlay SHALL be navigable using keyboard (Tab, Enter, Escape keys)
2. THE Question_Cards SHALL have appropriate ARIA labels describing the question and options for screen readers
3. WHEN the Onboarding_Overlay is active, THE focus SHALL be trapped within the overlay to prevent interaction with background elements
4. THE Onboarding_Overlay SHALL announce step transitions to screen readers using aria-live regions
