# Teleops Circle-Based Multi-Tenant Platform User Guide

## Document Information

- **Version**: 2.0 (Circle-Based Multi-Tenant Platform)
- **Target Audience**: All Circle-Based Platform Users
- **Last Updated**: December 28, 2024
- **Supported Versions**: Circle-Based Web App v2.0+, VLT-Compatible Mobile App v2.0+

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Corporate Admin Guide](#corporate-admin-guide)
3. [Circle Admin Guide](#circle-admin-guide)
4. [Multi-Circle Vendor Guide](#multi-circle-vendor-guide)
5. [Field Engineer Guide (VLT-Style)](#field-engineer-guide-vlt-style)
6. [Project Manager Guide](#project-manager-guide)
7. [Mobile App GPS Verification Guide](#mobile-app-gps-verification-guide)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#frequently-asked-questions)

---

## Getting Started

### Circle-Based Multi-Tenant Platform Overview

The Teleops Circle-Based Multi-Tenant Platform operates on a **Corporate → Circle → Vendor** hierarchy that mirrors the Indian telecommunications industry structure, where circles operate as quasi-independent business entities.

#### Tenant Types and Access

```yaml
Corporate Tenants (Telecom Company HQ):
  Examples: Vodafone India HQ, Airtel Corporate
  Capabilities:
    - Create and oversee multiple circle tenants
    - Consolidated reporting across all circles
    - Corporate governance and policy enforcement
    - Cross-circle analytics and benchmarking

Circle Tenants (Independent Business Units):
  Examples: Vodafone MPCG, Vodafone UPE, Vodafone Gujarat
  Capabilities:
    - Independent vendor management and relationships
    - Circle-specific billing and revenue tracking
    - Autonomous operational decisions
    - Circle-bound employee structures

Vendor Tenants (Service Providers):
  Examples: ABC Infrastructure, XYZ Telecom Services
  Capabilities:
    - Multi-circle relationship management
    - Circle-specific contracts and performance tracking
    - Independent billing per circle relationship
    - Unified vendor dashboard across circles
```

### System Requirements

**Web Application:**

- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Stable internet connection (minimum 5 Mbps for GPS photo uploads)
- Screen resolution: 1024x768 or higher
- Circle-specific subdomain access (e.g., `vodafone-mpcg.teleops.com`)

**Mobile Application (GPS-Enabled):**

- iOS 14.0+ or Android 8.0+
- 4GB RAM minimum (for GPS photo processing)
- 2GB free storage space (for offline GPS data)
- **GPS capability required** (5-meter accuracy minimum)
- **Camera access required** (for mandatory GPS photo tagging)
- Network connectivity for real-time synchronization

### First Time Login and Circle Access

1. **Receive Circle-Specific Welcome Email**

   - Check email for circle-specific login credentials
   - Note your circle subdomain (e.g., `vodafone-mpcg.teleops.com`)
   - Click activation link to set your password

2. **Access Your Circle Platform**

   - **Web**: Navigate to your circle's subdomain
   - **Mobile**: Download Teleops app and select your circle
   - **Corporate Users**: Access consolidated dashboard across circles

3. **Initial Circle Setup**
   - Complete tenant-driven profile information
   - Set up custom organizational structure (only Super Admin predefined)
   - Create custom designations based on your business needs
   - Configure circle-specific permissions and access levels
   - Set notification preferences for circle operations

---

## Corporate Admin Guide

### Corporate Dashboard Overview

The corporate dashboard provides consolidated oversight across all circle tenants with revenue multiplication tracking.

#### Revenue Multiplication Dashboard

**Business Metrics Display:**

```yaml
Traditional Model: ₹2L/month
Circle-Based Model:
  - Vodafone MPCG: ₹1.5L/month
  - Vodafone UPE: ₹2L/month
  - Vodafone Gujarat: ₹1.8L/month
  Total: ₹5.3L/month (265% increase)

Dashboard Components:
  - Cross-circle revenue analytics
  - Circle performance comparison
  - Vendor relationship mapping
  - Consolidated operational metrics
```

### Corporate Circle Management

#### Creating Circle Tenants

**Function**: `create_corporate_circles()`

**Process:**

1. Navigate to **Corporate Management** > **Circle Creation**
2. Select Operating Circles:
   ```yaml
   Available Indian Telecom Circles:
     Northern: Punjab, Haryana, Himachal Pradesh, J&K
     Western: Gujarat, Maharashtra, Mumbai, Rajasthan
     Eastern: West Bengal, Bihar, Odisha, Assam
     Southern: Karnataka, Andhra Pradesh, Tamil Nadu, Kerala
     Central: Madhya Pradesh, UP East, UP West
   ```
3. Circle Configuration:

   - Circle head assignment
   - Independent billing setup
   - Vendor management permissions
   - Reporting and governance levels

4. Automatic Circle Tenant Creation:
   - Independent circle environments provisioned
   - Circle-specific subdomains created
   - Separate billing and operational systems
   - Circle admin access configured

#### Cross-Circle Analytics

**Function**: `generate_cross_circle_analytics()`

**Analytics Capabilities:**

1. **Consolidated Performance Metrics**:

   - Revenue tracking across all circles
   - Operational efficiency comparison
   - Vendor performance across circles
   - Resource utilization analytics

2. **Circle Comparison Dashboard**:

   - Circle-wise revenue breakdown
   - Performance benchmarking
   - Best practice identification
   - Growth opportunity analysis

3. **Vendor Relationship Mapping**:
   - Multi-circle vendor relationships
   - Vendor performance across circles
   - Contract value distribution
   - Vendor capability analysis

### Corporate Governance and Oversight

#### Circle Independence Management

**Function**: `manage_circle_independence()`

**Governance Configuration:**

```yaml
Circle Autonomy Settings:
  Independent Vendor Management: Enable/Disable per circle
  Autonomous Billing: Separate P&L per circle
  Independent Operations: Circle-specific decision making
  Corporate Reporting: Aggregated data sharing levels

Oversight Capabilities:
  Policy Enforcement: Corporate-level standards
  Compliance Monitoring: Cross-circle compliance tracking
  Performance Standards: Circle performance benchmarks
  Strategic Coordination: Cross-circle initiatives
```

---

## Circle Admin Guide

### Circle Operations Dashboard

Circle admins manage independent business operations within their geographic circle with full vendor management autonomy.

#### Circle-Specific Business Management

**Dashboard Components:**

- Circle revenue and P&L tracking (e.g., Vodafone MPCG: ₹1.5L/month)
- Circle-specific vendor relationships and performance
- Circle operational metrics and KPIs
- Circle team management and assignments

### Circle Vendor Management

#### Vendor Invitation and Onboarding

**Function**: `invite_circle_vendor()`

**Circle Vendor Invitation Process:**

1. **Vendor Information Entry**:

   ```yaml
   Vendor Details:
     Vendor Name: ABC Infrastructure
     Vendor Code: MPCG-ABC-001 (client-generated from existing vendor management system)
     Service Areas: Districts within MPCG circle
     Service Capabilities: Dismantling, Installation, Maintenance
     Contact Access Level: Basic, Full, Restricted
   ```

2. **Circle-Specific Terms**:

   - Contract terms specific to MPCG circle
   - Service level agreements for circle
   - Performance metrics and expectations
   - Circle-specific billing arrangements

3. **Vendor Registration**:
   - System sends circle-specific invitation
   - Vendor registers for MPCG circle access
   - Automatic relationship activation
   - Circle-specific permissions applied

#### Multi-Circle Vendor Coordination

**Function**: `coordinate_multi_circle_vendors()`

**Multi-Circle Vendor Management:**

```yaml
ABC Infrastructure Multi-Circle Relationships:
  Vodafone MPCG Circle:
    - Vendor Code: VOD-MPCG-ABC-001 (Vodafone-generated)
    - Contract: ₹50K/month
    - Service Areas: MPCG districts
    - Performance: Circle-specific metrics

  Airtel UPE Circle:
    - Vendor Code: AIR-UPE-INFRA-24 (Airtel-generated)
    - Contract: ₹50K/month
    - Service Areas: UPE districts
    - Performance: Independent metrics

  Jio Gujarat Circle:
    - Vendor Code: JIO-GJ-ABC-042 (Jio-generated)
    - Contract: ₹50K/month
    - Service Areas: Gujarat districts
    - Performance: Separate tracking

Note: Each client generates their own vendor code in their vendor management system
```

### Circle-Specific User Management

#### Tenant-Driven Designation Creation

**Function**: `create_circle_designations()`

**Organizational Freedom:**

```yaml
Complete Organizational Autonomy:
  Predefined Roles: Only Super Admin (system-defined)
  Custom Designations: Create based on circle business needs

Example Circle Organizational Structure:
  Management Level:
    - Circle Head
    - Regional Manager
    - Operations Manager

  Field Operations:
    - Field Supervisor
    - Site Engineer
    - Technician
    - Safety Officer

  Support Functions:
    - Project Coordinator
    - Quality Inspector
    - Administrative Support

Note: Each circle creates their own organizational structure
```

### Circle Billing and Revenue Management

#### Independent Circle Billing

**Function**: `manage_circle_billing()`

**Circle Billing Features:**

1. **Separate P&L Tracking**:

   - Circle-specific revenue tracking
   - Independent cost management
   - Circle performance metrics
   - Vendor cost allocation

2. **Circle Financial Analytics**:

   - Monthly revenue reports
   - Cost per project analysis
   - Vendor expense tracking
   - Profitability analysis

3. **Corporate Reporting Integration**:
   - Consolidated reporting to corporate
   - Circle contribution to overall revenue
   - Performance benchmarking
   - Strategic planning support

---

## Multi-Circle Vendor Guide

### Multi-Circle Vendor Dashboard

Vendors can manage relationships with multiple circles through a unified interface while maintaining independent operations per circle.

#### Unified Multi-Circle Operations

**Dashboard Overview:**

```yaml
ABC Infrastructure Multi-Circle View:
  Total Monthly Revenue: ₹150K (3 circles)
  Circle Relationships:
    - MPCG: ₹50K/month, 15 active projects
    - UPE: ₹50K/month, 12 active projects
    - Gujarat: ₹50K/month, 18 active projects

  Performance Metrics:
    - Overall: 95% completion rate
    - MPCG: 97% (best performing)
    - UPE: 93% (improvement needed)
    - Gujarat: 95% (on target)
```

### Circle-Specific Operations

#### Circle-Specific Access and Permissions

**Function**: `access_circle_specific_operations()`

**Circle-Isolated Operations:**

1. **MPCG Circle Access**:

   - MPCG-specific contact directory
   - MPCG project assignments
   - MPCG performance tracking
   - MPCG communication channels

2. **Circle-Specific Communications**:

   - Isolated communication per circle
   - Circle-bound email threads
   - Circle-specific deviation reports
   - Independent escalation channels

3. **Independent Performance Tracking**:
   - Circle-specific KPIs
   - Separate billing per circle
   - Circle-specific compliance requirements
   - Independent contract terms

### Multi-Circle Project Coordination

#### Resource Sharing Between Circles

**Function**: `coordinate_cross_circle_resources()`

**Cross-Circle Coordination Capabilities:**

```yaml
Resource Optimization:
  Team Sharing: Share skilled teams across circles (with permissions)
  Equipment Coordination: Coordinate equipment between circles
  Best Practice Sharing: Share successful approaches across circles
  Training Coordination: Unified training across circles

Multi-Circle Benefits:
  Economy of Scale: Shared resources and expertise
  Risk Distribution: Diversified revenue across circles
  Knowledge Transfer: Best practices across circles
  Strategic Growth: Expand to new circles through relationships
```

---

## Field Engineer Guide (VLT-Style)

### VLT-Compatible Mobile Operations

The mobile app implements VLT-style equipment verification workflows with mandatory GPS photo tagging and offline synchronization.

#### VLT-Style Equipment Verification Workflow

**Equipment Categories (VLT-Based):**

```yaml
Primary Equipment Categories:
  CABINET: Equipment housing (RBS-2964, RBS-2954, RBS-2204, etc.)
  CARDS: Electronic modules (EDRU 9P-03, EDRU 9P-01, DTRU, etc.)
  DXU: Digital units (DXU-31, DXU-23, DXU-21)
  PSU: Power supplies (PSU-DC-32, PSU-AC-31)

Secondary Categories:
  IDM: Indoor modules (IDM13, IDM15, IDM14, IDM12)
  FCU: Cooling units (FCU)
  DCCU: DC converters (DCCU)
  PAU: Power amplifiers (PAU)
  CXU: Control units (CXU)
  OTHER: Miscellaneous equipment
```

### Mobile App Navigation (GPS-Enabled)

#### GPS-Mandatory Photo Verification

**Function**: `capture_gps_tagged_photos()`

**GPS Photo Requirements:**

```yaml
Mandatory GPS Features:
  GPS Accuracy: 5-meter minimum threshold
  GPS Coordinates: Embedded in all verification photos
  GPS Validation: Real-time accuracy checking
  GPS Metadata: Latitude, longitude, timestamp, accuracy

Photo Types with GPS:
  Equipment Found: GPS-tagged equipment photos
  Equipment Condition: Damage assessment with GPS
  Site Overview: General site context with GPS coordinates
  Not Found Areas: Search area documentation with GPS
  Serial Numbers: Close-up photos with GPS verification
```

### Site Assignment and GPS Check-in

#### GPS-Based Site Verification

**Function**: `gps_site_checkin()`

**GPS Check-in Process:**

1. **GPS Location Verification**:

   - GPS coordinates must match site location (±50 meters)
   - Real-time GPS accuracy validation
   - Site boundary verification
   - GPS signal strength monitoring

2. **Site Photo Documentation**:

   - Site overview with GPS coordinates
   - Site identification with GPS tagging
   - Access route documentation with GPS
   - Team arrival confirmation with GPS

3. **VLT-Style Safety Check**:
   - GPS-tagged safety equipment verification
   - Safety checklist with location validation
   - Team safety photos with GPS coordinates

### Equipment Verification (Category → Model)

#### Category-Based Equipment Verification

**Function**: `verify_equipment_by_category()`

**VLT-Style Verification Process:**

1. **Category Selection**:

   ```yaml
   Equipment Categories: CABINET → Select specific model (RBS-2964, RBS-2954, etc.)
     CARDS → Select card type (EDRU 9P-03, EDRU 9P-01, etc.)
     DXU → Select DXU model (DXU-31, DXU-23, DXU-21)
     PSU → Select PSU type (PSU-DC-32, PSU-AC-31)
   ```

2. **Model-Specific Verification**:

   - Select exact model within category
   - Found/Not Found determination
   - Serial number verification (if found)
   - Condition assessment
   - GPS-tagged photo documentation

3. **Not Found Workflow**:
   ```yaml
   Not Found Reasons (VLT-Compatible):
     "Not Found": Equipment completely missing
     "Used by BSS": Equipment in use by base station
     "Engaged with other Technology": Equipment repurposed
     "Post RFI": Equipment status pending RFI response
     "Others": Custom reason with additional details
   ```

### Offline GPS Operations

#### GPS Data Synchronization

**Function**: `sync_offline_gps_data()`

**Offline GPS Capabilities:**

```yaml
Offline Features:
  GPS Coordinates: Cached locally with equipment data
  GPS Photos: Stored locally with embedded GPS metadata
  Verification Status: Equipment states maintained offline
  Progress Tracking: Task progress calculated offline

Synchronization Features:
  Automatic Sync: When connectivity restored
  Conflict Resolution: Latest timestamp wins
  GPS Validation: GPS coordinates validated during sync
  Photo Upload: GPS metadata preserved during upload
```

---

## Project Manager Guide

### Circle-Aware Project Management

Project managers operate within circle boundaries with equipment category/model selection and GPS verification oversight.

#### Project Design with Equipment Categories

**Function**: `design_project_with_equipment_categories()`

**Project Design Workflow:**

1. **Equipment Category Selection**:

   ```yaml
   Project Design Phase (No Quantities):
     Select Categories: CABINET, CARDS, DXU, PSU
     Select Models: RBS-2964, EDRU 9P-03, DXU-31, PSU-DC-32
     Define Specifications: Technical requirements
     Equipment Requirements: What is needed (not quantities)
   ```

2. **Site Association and Inventory**:
   ```yaml
   Project Inventory Phase (With Quantities):
     Add Sites: Site locations and access details
     Allocate Equipment: Quantities per site based on design
     Site Inventory: Site-specific equipment allocation
     Ready for Tasks: Equipment ready for task creation
   ```

### VLT-Style Task Management

#### Task Creation with Equipment Inheritance

**Function**: `create_vlt_style_tasks()`

**Task Creation Process:**

1. **Site Selection for Tasks**:

   - Select sites from project inventory
   - Equipment automatically inherited from site allocation
   - Category-organized equipment checklists
   - GPS verification requirements set

2. **VLT-Compatible Task Workflow**:

   ```yaml
   Task Status Progression: ALLOCATED → ASSIGNING → ASSIGNED → ACTIVE → DONE

   Equipment Verification Integration: Category-organized checklists
     GPS photo requirements
     Found/Not Found workflows
     Progress tracking per category
   ```

### Circle-Specific Reporting

#### Circle Performance Analytics

**Function**: `generate_circle_analytics()`

**Circle-Specific Reports:**

```yaml
Circle Performance Reports:
  Project Completion: Circle-specific completion rates
  Equipment Recovery: Circle-wise equipment recovery rates
  GPS Compliance: GPS photo tagging compliance rates
  Team Performance: Circle team productivity metrics

Vendor Performance Reports:
  Circle-Vendor Performance: Performance per vendor per circle
  Multi-Circle Comparison: Vendor performance across circles
  Contract Compliance: Circle-specific contract adherence
  Quality Metrics: Circle-specific quality standards
```

---

## Mobile App GPS Verification Guide

### GPS-Mandatory Equipment Verification

The mobile app implements mandatory GPS photo tagging for all equipment verification activities.

#### GPS Photo Capture Workflow

**Function**: `capture_mandatory_gps_photos()`

**GPS Photo Requirements:**

1. **GPS Accuracy Validation**:

   ```yaml
   GPS Requirements:
     Minimum Accuracy: 5 meters
     Signal Strength: Good (4+ satellites)
     Location Consistency: Within site boundaries
     Real-time Validation: GPS accuracy checked before capture
   ```

2. **Photo Types with GPS**:
   - **Equipment Found**: Show equipment with GPS coordinates
   - **Equipment Serial Numbers**: Close-up with GPS validation
   - **Equipment Condition**: Damage documentation with GPS
   - **Site Overview**: General site photos with GPS metadata
   - **Not Found Areas**: Search area documentation with GPS

#### Equipment Verification by Category

**Function**: `verify_equipment_with_gps()`

**Category-Based Verification:**

1. **CABINET Equipment Verification**:

   ```yaml
   Models: RBS-2964, RBS-2954, RBS-2204, RBS-2202
   Verification: Found/Not Found with GPS photos
   Serial Numbers: Required (GPS-tagged close-up photos)
   Condition: Physical condition assessment with GPS
   ```

2. **CARDS Equipment Verification**:
   ```yaml
   Models: EDRU 9P-03, EDRU 9P-01, DTRU, DRU-900
   Verification: Found/Not Found with GPS photos
   Serial Numbers: Required (GPS-tagged photos)
   Multiple Units: Individual verification per card with GPS
   ```

### Offline GPS Synchronization

#### GPS Data Management

**Function**: `manage_offline_gps_data()`

**Offline GPS Features:**

```yaml
Local GPS Storage:
  GPS Coordinates: Cached with equipment data
  GPS Photos: Stored locally with embedded metadata
  GPS Accuracy: Validation data cached offline
  Site Boundaries: GPS boundaries cached for validation

Synchronization Process:
  Upload Queue: GPS photos queued for upload
  Metadata Preservation: GPS data maintained during sync
  Conflict Resolution: GPS timestamp-based resolution
  Progress Updates: Real-time sync status
```

---

## Troubleshooting

### Circle-Based Platform Issues

#### Circle Access Problems

**Issue**: Cannot access circle-specific features

**Solutions:**

1. **Circle Permission Issues**:

   - Verify circle assignment in user profile
   - Check circle-specific permissions
   - Confirm circle subdomain access
   - Contact circle admin for access

2. **Multi-Circle Vendor Access**:
   - Verify vendor relationships for each circle
   - Check circle-specific permissions
   - Confirm independent circle access
   - Review vendor invitation status

#### GPS Photo Issues

**Issue**: GPS photos not capturing or uploading

**Solutions:**

1. **GPS Accuracy Problems**:

   - Check GPS signal strength (4+ satellites required)
   - Move to open area for better GPS reception
   - Wait for GPS accuracy to improve (<5 meters)
   - Restart location services

2. **GPS Photo Upload Failures**:
   - Check internet connection for upload
   - Verify GPS metadata embedded in photos
   - Clear app cache and retry upload
   - Contact support for GPS upload issues

### VLT-Style Equipment Verification Issues

#### Equipment Verification Problems

**Issue**: Cannot find or verify equipment

**Solutions:**

1. **Category/Model Selection Issues**:

   - Verify correct equipment category selected
   - Check model list for equipment type
   - Use "OTHER" category if equipment not listed
   - Add custom model if needed

2. **GPS Verification Failures**:
   - Ensure GPS accuracy meets requirements
   - Verify GPS coordinates within site boundary
   - Check camera permissions for GPS tagging
   - Restart app if GPS tagging fails

### Offline Synchronization Issues

#### Data Sync Problems

**Issue**: Offline data not synchronizing

**Solutions:**

1. **Sync Conflicts**:

   - Check internet connection stability
   - Verify sync queue in app settings
   - Manually trigger synchronization
   - Contact support for conflict resolution

2. **GPS Data Sync Issues**:
   - Verify GPS metadata in photos
   - Check GPS coordinates validity
   - Ensure photos meet size requirements
   - Review sync error messages

---

## Frequently Asked Questions

### Circle-Based Platform Questions

**Q: How does the Circle-Based Multi-Tenant Platform work?**
A: The platform operates on Corporate → Circle → Vendor hierarchy. Corporates create circle tenants (e.g., Vodafone MPCG, UPE), circles independently manage vendors, enabling revenue multiplication (₹5.3L vs ₹2L traditional).

**Q: Can vendors work with multiple circles?**
A: Yes, vendors can have independent relationships with multiple circles. Each circle relationship has separate contracts, billing, and performance tracking.

**Q: How is billing handled in circle-based operations?**
A: Each circle has independent billing and P&L tracking. Corporate gets consolidated reporting while circles maintain autonomous operations.

**Q: What organizational freedom do tenants have?**
A: Complete autonomy. Only Super Admin is predefined. Tenants create their own designations, organizational structure, and permission schemes based on business needs.

### VLT-Style Operations Questions

**Q: What is VLT-style equipment verification?**
A: VLT-compatible workflow with category-organized equipment checklists, Found/Not Found determination, GPS photo tagging, and serial number verification matching proven VLT field operations.

**Q: Why are GPS coordinates mandatory for photos?**
A: GPS coordinates provide location verification, ensure compliance, enable spatial analysis, and support audit requirements for equipment verification.

**Q: How does the Category → Model equipment structure work?**
A: Equipment organized by categories (CABINET, CARDS, DXU) with specific models within each category (e.g., CABINET: RBS-2964, RBS-2954). This enables systematic verification without technology constraints.

### Technical Questions

**Q: What GPS accuracy is required?**
A: Minimum 5-meter accuracy required for all GPS-tagged photos. App validates GPS accuracy before allowing photo capture.

**Q: How does offline synchronization work?**
A: App stores GPS coordinates, photos, and verification data locally. Automatic sync when connectivity restored with conflict resolution based on timestamp.

**Q: Can equipment be used across different technology projects?**
A: Yes, equipment structure removes technology constraints. Jumpers, PSUs, and other equipment can be used across 2G, 3G, MW, and other project types.

### Mobile App Questions

**Q: What storage is needed for GPS photos?**
A: Recommend 2GB free space for GPS photos and offline data. Photos include embedded GPS metadata increasing file size.

**Q: Does the app work without cellular data?**
A: Yes, full offline capability with GPS coordinate capture and photo storage. Sync when connectivity restored.

**Q: How often is GPS location updated?**
A: GPS coordinates captured with each photo. Real-time accuracy validation before photo capture.

---

## Support and Contact Information

### Circle-Based Platform Support

**Corporate Support:**

- Corporate Dashboard Issues: corporate-support@teleops.com
- Cross-Circle Analytics: analytics-support@teleops.com
- Circle Creation: circle-setup@teleops.com

**Circle-Specific Support:**

- Circle Operations: [circle-code]-support@teleops.com
- Vendor Management: vendor-support@teleops.com
- Circle Billing: billing-support@teleops.com

**Multi-Circle Vendor Support:**

- Multi-Circle Operations: multi-circle@teleops.com
- Vendor Dashboard: vendor-dashboard@teleops.com
- Cross-Circle Coordination: coordination@teleops.com

**GPS and Mobile App Support:**

- GPS Issues: gps-support@teleops.com
- Mobile App: mobile-support@teleops.com
- Photo Upload: photo-support@teleops.com
- Offline Sync: sync-support@teleops.com

### Emergency Support

**24/7 Critical Support:**

- Circle Operations: +91-XXX-XXX-XXXX
- GPS Verification: +91-XXX-XXX-XXXX
- Data Synchronization: +91-XXX-XXX-XXXX

### Training and Resources

**Training Resources:**

- Circle-Based Platform Training: training.teleops.com/circles
- VLT-Style Operations: training.teleops.com/vlt
- GPS Verification: training.teleops.com/gps
- Multi-Circle Management: training.teleops.com/multi-circle

---

**Document Version**: 2.0 (Circle-Based Multi-Tenant Platform)  
**Last Updated**: December 28, 2024  
**Supported App Versions**: Circle-Based Web v2.0+, VLT-Compatible Mobile v2.0+  
**Architecture**: Corporate → Circle → Vendor with VLT-Style GPS Operations
