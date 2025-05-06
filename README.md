# Millbrook Scorekeeper

A mobile-friendly, offline-capable web app for tracking scores and wagers in the Millbrook Game and optional Big Game.

## Features

- **Millbrook Game Scoring** - Track all aspects of the Millbrook side match:
  - Team play (Red vs Blue)
  - Base, carry, and doubles tracking
  - Automatic junk detection (Birdies, Sandies, Greenies, etc.)
  - Running ledger with detailed payouts

- **Big Game Support** - Optional tracking of "two best net" scores for Big Game reporting

- **Course Management** - Create, edit and select different courses and tees:
  - Store multiple courses with full details
  - Support for different tee options per player
  - Hole-specific information (par, yardage, stroke index)
  - Import/export course data as JSON

- **Player Management** - Maintain roster of players with handicap info:
  - Save player preferences between rounds
  - Quick player selection for new matches
  - Team assignment functionality

- **Offline Capable** - Install as a PWA and use without an internet connection

- **Mobile Optimized** - Designed for quick score entry on the course

## Current Status (May 2023)

The application is feature-complete for the core Millbrook Game and Big Game functionality. 
All calculation components are implemented and tested:
- ✅ Stroke allocation
- ✅ Base and doubles calculation
- ✅ Hole payouts and running totals
- ✅ Junk event detection
- ✅ Big Game calculation

All major UI components are implemented:
- ✅ Match setup
- ✅ Hole view with score entry
- ✅ Enhanced ledger view with detailed payouts
- ✅ Settlement view with export functionality
- ✅ Course management with import/export

## Recently Completed Features

- **Enhanced Ledger Drawer**: Detailed per-hole payouts with improved visualizations, running totals, and better Big Game integration.
- **Settlement Export**: Export your final results as CSV for spreadsheet analysis or PNG for easy sharing.
- **Course Data Import/Export**: Share course data between devices or backup your course collection with JSON export/import functionality.

## In-Progress Features

Current development focuses on:
- Tee-aware score input to show player-specific hole information
- Enhanced stroke allocation based on player's tee selection
- Improved course visualization and details
- Player preference persistence

## Getting Started

### For Players

1. Visit [app URL] on your mobile device
2. Add to home screen when prompted for the best experience
3. Enter player names and handicap indexes
4. Toggle "Big Game" on if needed
5. Start your round and enter scores hole by hole
6. Use the ledger drawer to track running totals
7. Export your final results as CSV or screenshot

### For Developers

```
# Clone the repo
git clone https://github.com/yourusername/millbrook-scorekeeper.git

# Install dependencies 
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Technology Stack

- React + TypeScript
- Zustand for state management
- Dexie.js for IndexedDB storage
- PWA features (Service Worker, Web Manifest)

## Rulebook

The app implements the Millbrook Game rules as documented in the [Millbrook-Game-and-Big-Game-Rulebooks.md](./Millbrook-Game-and-Big-Game-Rulebooks.md) file.

## Development Roadmap

See [PROGRESS.md](./PROGRESS.md) for detailed task tracking and upcoming development plans.

## License

MIT
