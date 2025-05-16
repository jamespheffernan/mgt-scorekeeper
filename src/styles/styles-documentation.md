# CSS Styles Documentation

This document outlines the purpose and contents of each CSS file within the `src/styles/` directory.

## Core & Global Styles

### `base.css`
- **Purpose:** Contains fundamental styles for the application.
- **Includes:**
    - CSS custom properties (variables) for colors, spacing, etc.
    - Global resets and base HTML element styling (`body`, `h1-h3`, `a`, etc.).
    - Default styles for common elements like `button`, `input`, `select`.
    - Specific global navigation button styles (e.g., `.nav-button.ledger`, `.nav-button.history`).
    - Generic `.nav-button` styles.
    - Score option styling (e.g., `.ace-score`, `.birdie-score`).
    - Button icon styling (`.button-icon`).
    - Styling for `select option` elements.
    - Styles for the animated submit button (`.submit-button` general variant).
    - Generic button primitives (e.g., `.btn`, `.btn-primary`).

### `utilities.css`
- **Purpose:** Provides general-purpose utility classes.
- **Includes:**
    - Team color classes (e.g., `.team-red-text`, `.team-blue-bg`).
    - Spacing utilities (margins, paddings).
    - Card styling.
    - General color utility classes.
    - Responsive helper classes.

### `app-layout.css`
- **Purpose:** Defines the core layout structure of the application.
- **Includes:**
    - Styles for main application containers like `.millbrook-app` (or equivalent).
    - `main` content area styling.
    - `.app-header` and `.app-footer` styles.

### `loading.css`
- **Purpose:** Styles for the application-wide loading screen.
- **Includes:**
    - `.loading-screen` class and its properties.

## Component-Specific Styles

### `components.css`
- **Purpose:** Styles for reusable UI components that are not large enough to warrant their own file.
- **Includes:**
    - "Error Boundary" component styles (e.g., `.error-container`, `.error-details`, `.error-reset-button`).
    - Generic `.error-message` styles.

### `header.css`
- **Purpose:** Styles specific to the main application header.
- **Includes:**
    - Styles for actions and navigation buttons located within the header context.

### `modals.css`
- **Purpose:** General styling for dialogs and modal windows.
- **Includes:**
    - Base modal container, overlay, header, content, and footer styles.

### `forms.css`
- **Purpose:** Styles related to forms and form elements.
- **Includes:**
    - Form action button styling.
    - Styles for the "Quick Handicap Editor" modal and its form elements.

## Feature/View Specific Styles

### `course-management.css`
- **Purpose:** Styles for all UI elements related to course creation, editing, and management.
- **Includes:**
    - "Course Setup" screen styles (course selection, tee selection).
    - "Course Manager" view styles (course list, details panel, tee details).
    - "Hole Editor" styles (table for editing hole pars/handicaps).
    - Import/Export button styles related to course data.
    - General `.panel-actions` used within course management.

### `course-details.css`
- **Purpose:** Styles for the detailed view of a course.
- **Includes:**
    - Tee selectors specific to the details panel.
    - Course statistics display.
    - Par distribution chart/display.
    - Hole preview grid.

### `player-roster.css`
- **Purpose:** Styles for the player roster management interface.
- **Includes:**
    - `PlayerRoster` component styles.
    - Styling for selected players list.
    - Player list display.
    - "Add Player" form styles.
    - Specific team assignment buttons within the roster context.
    - Responsive and mobile layouts for the player roster.

### `hole-info.css`
- **Purpose:** Styles for components that display static information about a golf hole.
- **Includes:**
    - Styles for the "Hole Info" display component (par, handicap, yardage).

### `hole-view.css`
- **Purpose:** Styles for the main score entry view for a single hole.
- **Includes:**
    - Score entry interface elements.
    - Player-specific tee information and badges within the score entry context.
    - Stroke indicators.
    - Hole navigation controls (next/previous hole).
    - Specific `.submit-button` used in hole view.
    - `.double-used-indicator`.
    - Responsive styling for hole actions.
    - Error messages specific to the Hole View.

### `current-standings.css`
- **Purpose:** Styles for the display of current game standings.
- **Includes:**
    - Main container for standings.
    - Team summary sections.
    - Individual player standings within the current game.
    - Toggle visibility button.

### `game-history.css`
- **Purpose:** Styles for the game history page or section.
- **Includes:**
    - Table styling for displaying past games.
    - Filters or sorting controls for game history.

### `settlement.css`
- **Purpose:** Styles for the post-game settlement views.
- **Includes:**
    - Main settlement view container and tabs (Summary, Details, Big Game).
    - Styling for team totals, player results, game stats in the summary.
    - Hole-by-hole details table in the details tab.
    - Big Game results display.
    - Action buttons for rematch, new game, export, etc.

### `ledger.css`
- **Purpose:** (Pre-existing) Manages styles related to the game ledger or detailed financial transaction view.
- **Includes:**
    - Styles for displaying ledger entries, balances, and player transactions.
    - Filtering or summary sections within the ledger.
    *(Note: This file was pre-existing. Description based on common ledger functionalities.)* 