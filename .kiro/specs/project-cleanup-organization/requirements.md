# Requirements Document

## Introduction

El proyecto de casino blackjack necesita una reorganización completa de su estructura de archivos y documentación. Actualmente hay archivos de pruebas, documentación y scripts dispersos en el directorio raíz que dificultan la navegación y mantenimiento del proyecto. Esta reorganización mejorará la estructura del proyecto, facilitará el desarrollo futuro y actualizará la documentación para reflejar el estado actual del sistema.

## Requirements

### Requirement 1

**User Story:** Como desarrollador, quiero que todos los archivos de pruebas estén organizados en directorios apropiados, para que sea fácil encontrar y ejecutar las pruebas específicas.

#### Acceptance Criteria

1. WHEN se revise el directorio raíz THEN no SHALL haber archivos de pruebas sueltos (test-*.js)
2. WHEN se muevan los archivos de pruebas THEN SHALL mantenerse la funcionalidad de cada prueba
3. WHEN se reorganicen las pruebas THEN SHALL actualizarse cualquier referencia o script que las ejecute
4. IF existen pruebas duplicadas THEN SHALL consolidarse en una sola versión mejorada

### Requirement 2

**User Story:** Como desarrollador, quiero que la documentación esté organizada de manera coherente, para que sea fácil encontrar información específica sobre el proyecto.

#### Acceptance Criteria

1. WHEN se revise la documentación THEN SHALL estar toda centralizada en el directorio docs/
2. WHEN se actualice la documentación THEN SHALL reflejar el estado actual del sistema
3. WHEN se organice la documentación THEN SHALL eliminarse archivos obsoletos o duplicados
4. IF hay documentación en el directorio raíz THEN SHALL moverse al directorio docs/ apropiado

### Requirement 3

**User Story:** Como desarrollador, quiero que los scripts y archivos de configuración estén en ubicaciones lógicas, para que la estructura del proyecto sea más profesional y mantenible.

#### Acceptance Criteria

1. WHEN se revisen los scripts THEN SHALL estar en directorios apropiados (scripts/, tools/, etc.)
2. WHEN se muevan archivos THEN SHALL actualizarse las referencias en package.json y otros archivos de configuración
3. WHEN se limpie el directorio raíz THEN SHALL contener solo archivos esenciales de configuración del proyecto
4. IF hay archivos temporales o de desarrollo THEN SHALL moverse a .gitignore o eliminarse

### Requirement 4

**User Story:** Como desarrollador, quiero que el README principal y la documentación de setup estén actualizados, para que nuevos desarrolladores puedan entender y configurar el proyecto fácilmente.

#### Acceptance Criteria

1. WHEN se actualice el README THEN SHALL incluir la nueva estructura del proyecto
2. WHEN se revise la documentación de setup THEN SHALL estar actualizada con los pasos actuales
3. WHEN se actualice la documentación THEN SHALL incluir información sobre las nuevas ubicaciones de archivos
4. IF hay información obsoleta THEN SHALL eliminarse o actualizarse

### Requirement 5

**User Story:** Como desarrollador, quiero que se mantenga un registro de los cambios realizados, para que el equipo entienda qué se movió y por qué.

#### Acceptance Criteria

1. WHEN se complete la reorganización THEN SHALL crearse un documento de migración
2. WHEN se muevan archivos THEN SHALL documentarse la nueva ubicación
3. WHEN se actualicen scripts THEN SHALL documentarse los cambios en los comandos
4. IF se eliminan archivos THEN SHALL documentarse qué se eliminó y por qué