# Course Management Feature Implementation Plan

## Background and Motivation

The Millbrook Game Scorekeeper currently has a single hardcoded course (Millbrook Golf & Tennis Club). Users need the ability to add and manage multiple courses to use the app at different golf courses. This feature will enable:

1. **Course Database**: Expand from single hardcoded course to multiple courses
2. **Multiple Import Methods**: Support various ways to add courses (API/web scraping, manual entry, photo OCR)
3. **Course Persistence**: Store courses in IndexedDB for offline access
4. **Course Selection**: Allow users to select course during game setup

The implementation will be phased, with photo/OCR import as the final feature to add.

## Key Challenges and Analysis

### Technical Challenges

1. **Data Sources Variety**: 
   - Different APIs have different data formats (USGA GHIN, golf course websites)
   - Web scraping requires handling various HTML structures
   - OCR from photos requires image processing and accuracy validation

2. **Data Validation**:
   - Course ratings and slopes must be within valid ranges
   - Hole pars must be reasonable (3-5)
   - Yardages must be sensible
   - Stroke indexes must be 1-18 without duplicates

3. **Offline-First Architecture**:
   - All courses must be stored locally in IndexedDB
   - Import mechanisms must work with intermittent connectivity
   - Course data should be exportable/importable

4. **User Experience**:
   - Import process must be simple and intuitive
   - Error handling must be clear when imports fail
   - Manual editing must be available for corrections

### Design Decisions

1. **Course Data Model**: Existing model is well-structured, no changes needed
2. **Import Priority**: API/web scraping first (more reliable), then manual, then photo
3. **Validation Layer**: Centralized validation for all import methods
4. **Progressive Enhancement**: Basic manual entry always available, advanced features added incrementally

## High-level Task Breakdown

### Phase 1: Course Management Foundation (Prerequisites)

**Branch Name**: `feature/course-management-foundation`

#### Task 1.1: Enhance Course Database Layer
- [ ] Add course validation utilities
- [ ] Add course search/filter functionality in millbrookDb
- [ ] Add course usage tracking (lastPlayed, timesPlayed)
- [ ] Create course export/import JSON format specification
- **Success Criteria**: 
  - Unit tests pass for all validation rules
  - Can search courses by name/location
  - Usage stats tracked accurately

#### Task 1.2: Improve Course Management UI
- [ ] Redesign CourseManager component for better UX
- [ ] Add course search/filter UI
- [ ] Add bulk actions (export all, delete multiple)
- [ ] Add course preview without edit mode
- **Success Criteria**:
  - UI is intuitive and responsive
  - All actions have confirmation dialogs
  - Preview shows all course details clearly

### Phase 2: API and Web Import

**Branch Name**: `feature/course-api-import`

#### Task 2.1: Create Course Import Service Architecture
- [ ] Create `CourseImportService` interface
- [ ] Create `CourseDataValidator` class
- [ ] Create `CourseDataNormalizer` class
- [ ] Set up error handling and logging
- **Success Criteria**:
  - Clean abstraction for different import sources
  - Comprehensive validation catches bad data
  - Normalized data matches Course interface

#### Task 2.2: Implement GHIN/USGA Course Data Import
- [ ] Research GHIN API access and requirements
- [ ] Create `GHINCourseImporter` class
- [ ] Handle authentication if required
- [ ] Map GHIN data to Course model
- **Success Criteria**:
  - Can search courses by name/location
  - Import creates valid Course objects
  - Handles API errors gracefully

#### Task 2.3: Implement Web Scraping Import
- [ ] Create `WebScraperImporter` base class
- [ ] Implement scrapers for popular sites (e.g., GolfNow, golf course websites)
- [ ] Add configurable scraping templates
- [ ] Handle anti-scraping measures respectfully
- **Success Criteria**:
  - Can import from at least 3 major sources
  - Scraping is respectful (rate limiting, robots.txt)
  - Failed scrapes provide helpful error messages

#### Task 2.4: Create Import UI Flow
- [ ] Design import wizard UI
- [ ] Add source selection (API vs URL)
- [ ] Show import preview before saving
- [ ] Allow editing imported data before save
- **Success Criteria**:
  - Import process is intuitive
  - User can review and edit before committing
  - Clear feedback during import process

### Phase 3: Manual Course Entry Enhancement

**Branch Name**: `feature/enhanced-manual-entry`

#### Task 3.1: Create Course Template System
- [ ] Add common course templates (Par 72, Par 71, etc.)
- [ ] Create quick-entry mode for basic courses
- [ ] Add copy-from-existing course feature
- **Success Criteria**:
  - Can create basic course in under 2 minutes
  - Templates cover common configurations
  - Copy feature works correctly

#### Task 3.2: Improve Hole Editor UX
- [ ] Add bulk editing capabilities
- [ ] Add hole reordering (for 9-hole courses played twice)
- [ ] Add undo/redo functionality
- [ ] Add keyboard shortcuts for quick entry
- **Success Criteria**:
  - Can edit multiple holes at once
  - Keyboard navigation works smoothly
  - Changes can be undone

### Phase 4: Photo/OCR Import

**Branch Name**: `feature/scorecard-photo-import`

#### Task 4.1: Set Up OCR Infrastructure
- [ ] Research and select OCR service (Tesseract.js vs cloud service)
- [ ] Create `PhotoImporter` service
- [ ] Set up image preprocessing pipeline
- [ ] Create scorecard detection algorithm
- **Success Criteria**:
  - Can extract text from clear scorecard photos
  - Preprocessing improves OCR accuracy
  - Scorecard layout detected automatically

#### Task 4.2: Implement Scorecard Parser
- [ ] Create scorecard layout templates
- [ ] Implement table detection and parsing
- [ ] Handle common scorecard variations
- [ ] Create confidence scoring system
- **Success Criteria**:
  - Accurately parses 80%+ of clear scorecards
  - Identifies low-confidence extractions
  - Handles both 9 and 18 hole cards

#### Task 4.3: Create Photo Import UI
- [ ] Design camera/upload interface
- [ ] Show photo preview with detected regions
- [ ] Display extracted data for review
- [ ] Allow manual corrections
- **Success Criteria**:
  - Works on mobile and desktop
  - User can verify OCR results
  - Easy to correct errors

#### Task 4.4: Add Smart Validation
- [ ] Cross-check OCR results with course databases
- [ ] Validate mathematical consistency
- [ ] Flag suspicious values for review
- [ ] Learn from user corrections
- **Success Criteria**:
  - Catches common OCR errors
  - Validation improves accuracy
  - System improves over time

## Acceptance Criteria

### Overall Feature Success Criteria
1. Users can add courses via at least 3 different methods
2. Course data is validated and stored correctly
3. All import methods work offline after initial setup
4. Course management doesn't slow down app startup
5. Imported courses work correctly in game play
6. Course data can be exported and shared

### Performance Criteria
- Course list loads in < 500ms with 50+ courses
- Import process provides progress feedback
- OCR processing completes in < 5 seconds
- No memory leaks during photo processing

### Quality Criteria
- 90%+ test coverage for import services
- All import methods handle errors gracefully
- Accessibility standards met (WCAG 2.1 AA)
- Works on devices with 2GB RAM

## Technical Decisions

### Architecture Decisions
1. **Service Layer**: Create abstracted import services for extensibility
2. **Validation Pipeline**: Centralized validation for consistency
3. **Progressive Enhancement**: Core features work without advanced APIs
4. **Offline-First**: All features work offline after initial setup

### Technology Choices
1. **OCR**: Start with Tesseract.js for offline capability, can add cloud OCR later
2. **Web Scraping**: Use fetch API with careful error handling
3. **Storage**: Continue using IndexedDB via Dexie
4. **Image Processing**: Use Canvas API for preprocessing

### Data Flow
1. Import Source → Parser → Validator → Normalizer → Preview → Storage
2. All imports go through same validation pipeline
3. User can intervene at preview stage
4. Failed imports are logged for debugging

## Project Status Board

### Phase 1: Course Management Foundation
- [ ] Task 1.1: Enhance Course Database Layer
- [ ] Task 1.2: Improve Course Management UI

### Phase 2: API and Web Import  
- [ ] Task 2.1: Create Course Import Service Architecture
- [ ] Task 2.2: Implement GHIN/USGA Course Data Import
- [ ] Task 2.3: Implement Web Scraping Import
- [ ] Task 2.4: Create Import UI Flow

### Phase 3: Manual Course Entry Enhancement
- [ ] Task 3.1: Create Course Template System
- [ ] Task 3.2: Improve Hole Editor UX

### Phase 4: Photo/OCR Import
- [ ] Task 4.1: Set Up OCR Infrastructure
- [ ] Task 4.2: Implement Scorecard Parser
- [ ] Task 4.3: Create Photo Import UI
- [ ] Task 4.4: Add Smart Validation

### Documentation & Deployment
- [ ] Write user documentation
- [ ] Create import troubleshooting guide
- [ ] Add analytics for import success rates
- [ ] Deploy and monitor

## Current Status / Progress Tracking

**Status**: Planning Phase Complete
**Last Updated**: 2024-12-28
**Current Phase**: Not Started
**Blocked By**: None
**Next Steps**: Begin Phase 1 implementation

## Executor's Feedback or Assistance Requests

*To be filled during implementation*

## Lessons Learned

*To be filled as implementation progresses* 