# Teleops Dismantling Operations Specification

## Overview

The Dismantling Operations module provides comprehensive workflow management for telecom infrastructure dismantling projects. This system coordinates field operations from project design through task completion, implementing a **VLT-style equipment verification workflow** with GPS photo tagging and offline synchronization capabilities.

---

## Business Context

### Dismantling Operations Architecture

```yaml
Operations Workflow:
  Step 1: Project Design (Equipment Categories & Models)
    - Client selects equipment categories needed (CABINET, CARDS, DXU, etc.)
    - Client selects specific models within each category
    - Equipment specifications and requirements documented
    - No quantities or site allocations in design phase

  Step 2: Site Association & Inventory Management
    - Sites added to project with automatic master data creation
    - Equipment quantities allocated per site based on design
    - Site-specific inventory created from project design
    - Equipment inheritance from category-model structure

  Step 3: Task Creation & Assignment
    - Client/Vendor creates tasks from projects with site selection
    - Tasks inherit equipment from project site inventory
    - Team assignment and acceptance workflow
    - VLT-compatible status progression

  Step 4: Field Operations Execution
    - Mobile app equipment verification with GPS tagging
    - Category-organized equipment checklists
    - Found/Not Found workflow with serial number verification
    - Offline capability with real-time sync

  Step 5: Task Completion & Closure
    - Equipment verification completion
    - Task progress tracking and completion
    - Quality review and sign-off
    - Project closure workflow

Integration Points:
  - Equipment Inventory: Category → Model hierarchy
  - Project Design: Equipment selection and specifications
  - Task Management: VLT-style verification workflow
  - Mobile App: GPS-enabled equipment verification
  - Site Management: Master data and location context
```

### Equipment-Centric Operations

```yaml
Equipment Categories (VLT-Based):
  Primary Categories:
    - CABINET: Equipment housing (RBS-2964, RBS-2954, etc.)
    - CARDS: Electronic modules (EDRU 9P-03, EDRU 9P-01, etc.)
    - DXU: Digital units (DXU-31, DXU-23, DXU-21)
    - PSU: Power supplies (PSU-DC-32, PSU-AC-31)

  Secondary Categories:
    - IDM: Indoor modules (IDM13, IDM15, IDM14, IDM12)
    - FCU: Cooling units (FCU)
    - DCCU: DC converters (DCCU)
    - PAU: Power amplifiers (PAU)
    - CXU: Control units (CXU)
    - OTHER: Miscellaneous equipment

Equipment Verification Workflow:
  1. Equipment Discovery: Category-organized checklists
  2. Equipment Verification: Found/Not Found with GPS tagging
  3. Serial Number Verification: Planned vs actual matching
  4. Condition Assessment: Physical equipment condition
  5. Photo Documentation: GPS-tagged equipment photos
  6. Progress Tracking: Real-time verification updates
```

### Field Operations Integration

```yaml
Mobile App Operations:
  Equipment Verification Features:
    - Category-based equipment organization
    - VLT-style verification workflow
    - GPS-mandatory photo tagging
    - Serial number verification
    - Offline synchronization capability
    - Real-time progress updates

  Site Operations Context:
    - Site location and access information
    - Equipment inventory per site
    - Safety and operational notes
    - Work instructions and procedures
    - Team coordination for multi-site tasks

  Equipment States Management:
    - Found: Equipment located and verified
    - Not Found: Equipment missing with reason
    - Not Verified: Equipment not yet checked
    - Conflict Resolution: Latest timestamp wins
```

---

## Field Operations Workflow

### 1. Pre-Operations Planning

#### Task Assignment and Preparation

```yaml
Task Assignment Process:
  Task Creation by Client/Vendor:
    - Manual task creation from project
    - Site selection from project sites
    - Equipment inheritance from project inventory
    - Task details and specifications defined

  Team Assignment by Vendor:
    - Vendor assigns task to field team
    - Team notification and task details access
    - Assignment acceptance by team
    - Task status progression (ALLOCATED → ASSIGNING → ASSIGNED)

  Pre-Operation Preparation:
    - Team reviews task details and site information
    - Equipment verification checklists prepared
    - Safety procedures and access requirements reviewed
    - Mobile app synchronization and offline data preparation

Field Team Task Access:
  - Complete task details (sites, equipment, project context)
  - Site location and access information
  - Equipment inventory and verification requirements
  - Safety protocols and operational procedures
  - Previous task history and lessons learned
```

#### Equipment Verification Preparation

```yaml
Equipment Verification Setup:
  Category-Based Organization:
    - Equipment organized by category (CABINET, CARDS, etc.)
    - Model-specific verification requirements
    - Serial number requirements per category
    - GPS tagging requirements for photos

  Verification Checklist Preparation:
    - Equipment categories and models from project design
    - Site-specific equipment allocations
    - Planned serial numbers (if available)
    - Verification priority levels (High, Medium, Low)

  Mobile App Configuration:
    - Equipment verification configuration downloaded
    - Category-specific verification workflows
    - GPS accuracy requirements
    - Photo requirements and specifications
    - Offline capability preparation

Equipment Verification Context:
  - Equipment categories provide structure for verification
  - Models within categories provide specific identification
  - Serial numbers enable precise equipment matching
  - GPS coordinates provide location verification
  - Photos provide visual evidence and documentation
```

### 2. Site Operations Execution

#### Equipment Verification Workflow

```yaml
Equipment Verification Process:
  Step 1: Site Arrival and Setup
    - GPS location verification
    - Site safety assessment
    - Equipment verification checklist review
    - Mobile app initialization

  Step 2: Equipment Discovery and Verification
    - Category-by-category equipment verification
    - Found/Not Found determination
    - Serial number verification (if equipment found)
    - Condition assessment and documentation
    - GPS-tagged photo documentation

  Step 3: Equipment Verification States
    Found Equipment:
      - Mark as Found (is_found = true)
      - Enter actual serial number (if visible)
      - Validate serial number match (planned vs actual)
      - Assess equipment condition
      - Take GPS-tagged equipment photos
      - Add verification notes

    Not Found Equipment:
      - Mark as Not Found (is_found = false)
      - Select reason from predefined list:
        * "Not Found" - Equipment completely missing
        * "Used by BSS" - Equipment in use by base station
        * "Engaged with other Technology" - Equipment repurposed
        * "Post RFI" - Equipment status pending RFI response
        * "Others" - Custom reason with additional details
      - Take GPS-tagged photos of search area
      - Add detailed notes about search efforts

  Step 4: Verification Completion
    - Equipment verification status updated
    - Progress synchronization (online/offline)
    - Task progress calculation
    - Next equipment category selection
```

#### GPS Photo Tagging Requirements

```yaml
GPS Photo Tagging Workflow:
  Mandatory GPS Requirements:
    - All equipment verification photos must include GPS coordinates
    - GPS accuracy must meet minimum threshold (typically 5-10 meters)
    - GPS coordinates captured at time of photo
    - GPS metadata embedded in photo file

  Photo Types with GPS:
    - Equipment Found Photos: Show equipment with GPS location
    - Equipment Condition Photos: Document equipment condition with GPS
    - Site Overview Photos: General site context with GPS
    - Not Found Area Photos: Show search area with GPS location

  GPS Data Capture:
    - Latitude/Longitude in decimal degrees
    - GPS accuracy in meters
    - Timestamp (UTC) of GPS capture
    - Altitude (optional)
    - GPS signal strength validation

  GPS Validation Rules:
    - Minimum GPS accuracy threshold
    - GPS coordinates within expected site boundary
    - GPS signal strength above minimum threshold
    - Location consistency across photos from same site
    - GPS metadata integrity verification
```

### 3. Multi-Site Coordination

#### MW Task Coordination

```yaml
MW Task Operations:
  Far-End/Near-End Coordination:
    - Single task contains both Far-End and Near-End sites
    - Coordinated equipment verification across both sites
    - Equipment verification per site within single task
    - Task progress tracks overall completion

  Site-Specific Equipment Verification:
    - Each site has separate equipment inventory
    - Equipment verification organized by site
    - GPS coordinates specific to each site location
    - Photo documentation per site with GPS metadata

  Progress Coordination:
    - Task progress aggregated across both sites
    - Individual site progress tracking
    - Overall task completion calculation
    - Coordination notes and communication
```

#### Equipment Verification Coordination

```yaml
Multi-Site Equipment Verification:
  Site-Specific Verification:
    - Equipment verification isolated per site
    - GPS coordinates specific to site location
    - Photo documentation per site
    - Site-specific equipment inventory

  Task-Level Progress Aggregation:
    - Overall task progress calculated from all sites
    - Equipment verification progress per site
    - Task completion based on all site verifications
    - Progress synchronization across team members

  Coordination Requirements:
    - Team coordination for multi-site tasks
    - Equipment verification status sharing
    - Progress updates and notifications
    - Conflict resolution across sites
```

### 4. Offline Operations and Synchronization

#### Offline Capability

```yaml
Offline Operations Support:
  Equipment Verification Offline:
    - Equipment verification data cached locally
    - GPS coordinates and photos stored locally
    - Verification progress tracking offline
    - Equipment verification states maintained offline

  Photo Management Offline:
    - GPS-tagged photos stored locally
    - Photo metadata preservation
    - GPS coordinates embedded in photos
    - Batch photo upload when connectivity restored

  Progress Tracking Offline:
    - Task progress calculated offline
    - Equipment verification status updates
    - Team member collaboration offline
    - Progress synchronization queue

Synchronization Workflow:
  - Automatic synchronization when connectivity restored
  - Conflict resolution based on latest timestamp
  - Progress updates and notifications
  - Photo upload with GPS metadata preservation
  - Equipment verification state synchronization
```

### 5. Quality Assurance and Completion

#### Equipment Verification Quality Control

```yaml
Quality Control Workflow:
  Verification Completeness Check:
    - All equipment categories verified (found or not found)
    - Required serial numbers entered for found equipment
    - GPS-tagged photos provided for all verification
    - Equipment condition assessments completed

  Data Quality Validation:
    - GPS coordinates accuracy validation
    - Photo GPS metadata integrity check
    - Serial number format validation
    - Equipment verification consistency check

  Completion Requirements:
    - All equipment verified (found or not found)
    - GPS photos provided for all equipment
    - Serial number verification completed
    - Equipment condition assessments documented
    - Task progress at 100% completion
```

#### Task Completion Workflow

```yaml
Task Completion Process:
  Equipment Verification Completion:
    - All equipment verified (found or not found)
    - "Not Found" equipment does not block completion
    - GPS photos provided for all equipment
    - Serial number verification completed (where applicable)

  Task Completion Criteria:
    - All equipment verification completed
    - GPS photo documentation provided
    - Equipment condition assessments completed
    - Task progress reaches 100%
    - Any team member can mark task as DONE

  Post-Completion Activities:
    - Equipment verification report generation
    - GPS photo compilation and organization
    - Serial number verification report
    - Equipment condition assessment report
    - Task completion notification and handoff
```

---

## Equipment Verification Data Management

### Equipment Verification Database Schema

```yaml
Equipment Verification Tables:
  task_equipment_verification:
    - Equipment verification records per task/site
    - Equipment category and model information
    - Verification status and findings
    - GPS coordinates and verification metadata
    - Serial number verification results

  task_equipment_verification_photos:
    - GPS-tagged photos for equipment verification
    - Photo types and GPS metadata
    - Photo file information and storage
    - GPS coordinates and accuracy data
    - Photo upload and synchronization status

Equipment Verification API:
  - Equipment verification CRUD operations
  - GPS photo upload and management
  - Equipment verification status updates
  - Progress tracking and synchronization
  - Conflict resolution and audit trail
```

### Equipment Verification Reporting

```yaml
Equipment Verification Reports:
  Task Equipment Verification Report:
    - Equipment verification summary by category
    - Found vs Not Found equipment analysis
    - Serial number verification results
    - GPS photo documentation summary
    - Equipment condition assessment report

  Site Equipment Verification Report:
    - Site-specific equipment verification results
    - GPS coordinates and location verification
    - Photo documentation per site
    - Equipment condition analysis per site
    - Site-specific completion metrics

  Multi-Site Coordination Report:
    - MW task coordination summary
    - Equipment verification across sites
    - Progress coordination and completion
    - GPS location verification across sites
    - Multi-site equipment verification analysis
```

---

## Mobile App Integration

### Equipment Verification Interface

```yaml
Mobile App Equipment Verification:
  Category-Based Interface:
    - Equipment organized by category (CABINET, CARDS, etc.)
    - Model selection within categories
    - Category-specific verification workflows
    - Progress tracking per category

  Verification Workflow Interface:
    - Found/Not Found selection with visual indicators
    - Serial number entry with validation
    - GPS-tagged photo capture
    - Equipment condition assessment
    - Verification notes and comments

  GPS Photo Integration:
    - Mandatory GPS tagging for all photos
    - GPS accuracy validation
    - GPS coordinates display and verification
    - Photo metadata preservation
    - Batch photo upload capability

Mobile App Features:
  - Offline equipment verification capability
  - Real-time progress synchronization
  - Conflict resolution with latest timestamp priority
  - Equipment verification checklist organization
  - GPS photo documentation and management
```

### Mobile App Offline Synchronization

```yaml
Offline Synchronization Features:
  Equipment Verification Offline:
    - Local equipment verification data storage
    - GPS coordinates and photo offline storage
    - Equipment verification progress tracking
    - Offline conflict resolution preparation

  Photo Management Offline:
    - GPS-tagged photos stored locally
    - Photo metadata preservation offline
    - GPS coordinates embedded in photos
    - Batch photo upload queue management

  Synchronization Workflow:
    - Automatic sync when connectivity restored
    - Conflict resolution based on timestamp
    - Progress updates and notifications
    - Photo upload with metadata preservation
    - Equipment verification state synchronization
```

---

## Integration Points

### 1. Project Design Integration

```yaml
Equipment Design to Operations:
  Equipment Categories and Models:
    - Equipment categories selected in project design
    - Models within categories specified
    - Equipment specifications and requirements
    - Verification requirements per category

  Operations Integration:
    - Equipment verification checklists generated from design
    - Category-specific verification workflows
    - Model-specific verification requirements
    - GPS photo requirements based on equipment type
```

### 2. Task Management Integration

```yaml
Task Creation to Operations:
  Task Equipment Inheritance:
    - Equipment from project design and inventory
    - Site-specific equipment allocations
    - Equipment verification requirements
    - Task progress tracking integration

  Operations Workflow Integration:
    - VLT-style equipment verification workflow
    - Task status progression and completion
    - Progress tracking and synchronization
    - Conflict resolution and audit trail
```

### 3. Site Management Integration

```yaml
Site Operations Context:
  Site Master Data:
    - Site location and access information
    - Site safety and operational requirements
    - Site-specific equipment context
    - GPS boundary and location validation

  Operations Integration:
    - Site-specific equipment verification
    - GPS location validation per site
    - Site access and safety protocol integration
    - Multi-site coordination for MW tasks
```

---

## Implementation Roadmap

### Phase 1: Core Equipment Verification (Weeks 1-3)

- VLT-style equipment verification workflow implementation
- Category-based equipment organization
- Found/Not Found workflow with GPS tagging
- Basic mobile app equipment verification interface

### Phase 2: GPS Photo Integration (Weeks 4-5)

- Mandatory GPS photo tagging implementation
- GPS accuracy validation and requirements
- Photo metadata preservation and management
- GPS coordinates validation and site boundary checking

### Phase 3: Offline Synchronization (Weeks 6-7)

- Offline equipment verification capability
- Local data storage and synchronization
- Conflict resolution based on timestamp
- Real-time progress updates and notifications

### Phase 4: Multi-Site Coordination (Weeks 8-9)

- MW task coordination workflow
- Multi-site equipment verification
- Site-specific progress tracking
- Equipment verification reporting and analytics

---

This Dismantling Operations specification provides a comprehensive framework for field operations with VLT-style equipment verification, GPS photo tagging, and offline synchronization capabilities, fully integrated with the project design and task management workflows.

_Last Updated: 2024-12-28_
