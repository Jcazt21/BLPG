# Design Document

## Overview

Este diseño establece una reorganización completa de la estructura del proyecto de casino blackjack para mejorar la mantenibilidad, navegación y profesionalismo del código. La reorganización se enfoca en mover archivos dispersos a ubicaciones lógicas, actualizar documentación y crear una estructura más coherente.

## Architecture

### Current Structure Issues
- Archivos de pruebas dispersos en el directorio raíz (test-*.js)
- Documentación específica de features en el directorio raíz
- Scripts de pruebas mezclados con archivos de configuración
- Falta de organización clara entre diferentes tipos de archivos

### Target Structure
```
project-root/
├── backend/
├── frontend/
├── docs/
│   ├── features/           # Feature-specific documentation
│   ├── development/        # Development guides
│   └── api/               # API documentation
├── scripts/               # Project-level scripts
├── tools/                 # Development tools and utilities
├── tests/                 # Already exists, will be enhanced
└── [essential config files only]
```

## Components and Interfaces

### 1. File Migration System
**Purpose**: Systematically move files to appropriate locations

**Components**:
- **Test File Migrator**: Moves root test files to appropriate test directories
- **Documentation Organizer**: Consolidates documentation in docs/ structure
- **Script Relocator**: Moves utility scripts to scripts/ directory
- **Reference Updater**: Updates all file references in configuration files

### 2. Documentation Update System
**Purpose**: Refresh and organize all project documentation

**Components**:
- **README Updater**: Updates main README with new structure
- **Feature Documentation Consolidator**: Organizes feature-specific docs
- **Setup Guide Refresher**: Updates installation and setup instructions
- **Migration Guide Creator**: Documents all changes made

### 3. Configuration Update System
**Purpose**: Update all configuration files to reflect new structure

**Components**:
- **Package.json Script Updater**: Updates npm scripts with new paths
- **Test Runner Updater**: Updates run-tests.js with new test locations
- **Docker Configuration Updater**: Updates any Docker-related paths
- **IDE Configuration Updater**: Updates .vscode settings if needed

## Data Models

### File Migration Map
```typescript
interface FileMigration {
  sourceFile: string;
  targetLocation: string;
  type: 'test' | 'documentation' | 'script' | 'config';
  requiresReferenceUpdate: boolean;
  dependencies: string[];
}
```

### Documentation Structure
```typescript
interface DocumentationStructure {
  category: 'features' | 'development' | 'api' | 'setup';
  files: DocumentFile[];
  needsUpdate: boolean;
}

interface DocumentFile {
  name: string;
  currentLocation: string;
  targetLocation: string;
  lastModified: Date;
  isObsolete: boolean;
}
```

## Error Handling

### File Migration Errors
- **Missing Dependencies**: Verify all referenced files exist before moving
- **Permission Issues**: Handle file system permission errors gracefully
- **Broken References**: Validate all file references after migration
- **Backup Strategy**: Create backup of original structure before changes

### Documentation Update Errors
- **Outdated Information**: Flag sections that may need manual review
- **Broken Links**: Identify and fix broken internal/external links
- **Format Inconsistencies**: Standardize documentation format across files

### Configuration Update Errors
- **Script Failures**: Validate all npm scripts work after path updates
- **Missing Files**: Ensure all referenced files exist in new locations
- **Environment Issues**: Test configuration in different environments

## Testing Strategy

### Pre-Migration Testing
1. **Current State Validation**: Document current working state of all tests and scripts
2. **Dependency Mapping**: Identify all file dependencies and references
3. **Backup Creation**: Create complete backup of current structure

### Migration Testing
1. **Incremental Validation**: Test each migration step individually
2. **Reference Verification**: Validate all updated references work correctly
3. **Script Testing**: Ensure all npm scripts and tools work with new paths

### Post-Migration Testing
1. **Full System Test**: Run complete test suite to ensure nothing is broken
2. **Documentation Verification**: Verify all documentation is accessible and accurate
3. **Developer Experience Test**: Ensure new structure improves developer workflow

## Implementation Plan Overview

### Phase 1: Preparation and Analysis
- Analyze current file structure and dependencies
- Create detailed migration plan
- Set up backup and rollback procedures

### Phase 2: File Migration
- Move test files to appropriate directories
- Relocate documentation to organized structure
- Move scripts and utilities to dedicated directories

### Phase 3: Reference Updates
- Update package.json scripts
- Update test runners and configuration files
- Fix all file references and imports

### Phase 4: Documentation Refresh
- Update README with new structure
- Refresh setup and development guides
- Create migration documentation

### Phase 5: Validation and Cleanup
- Run comprehensive tests
- Validate all functionality works
- Clean up any remaining issues

## Specific File Migrations

### Test Files (Root → tests/)
```
test-8-players-comprehensive.js → tests/e2e/
test-dealer-personality.js → tests/integration/dealer/
test-dealer-simple.js → tests/integration/dealer/
test-fallbacks-only.js → tests/unit/dealer/
test-nuevas-respuestas.js → tests/unit/dealer/
test-victory-persistence.js → tests/unit/victory/
```

### Documentation Files (Root → docs/)
```
VICTORY_COUNTER_FRONTEND_IMPLEMENTATION.md → docs/features/victory-counter/
VICTORY_COUNTER_SUMMARY.md → docs/features/victory-counter/
VICTORY_PERSISTENCE_FIX.md → docs/features/victory-counter/
plantilla-respuestas-dealer.md → docs/features/dealer-assistant/
```

### Scripts and Tools
```
run-tests.js → scripts/
test-victory-display.html → tools/testing/
run-docker.bat → scripts/
```

## Success Criteria

1. **Clean Root Directory**: Only essential configuration files remain in root
2. **Organized Structure**: All files are in logical, discoverable locations
3. **Working Functionality**: All tests, scripts, and tools work correctly
4. **Updated Documentation**: All documentation reflects current system state
5. **Improved Developer Experience**: Easier navigation and understanding of project structure