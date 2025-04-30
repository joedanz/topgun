# Top Gun Game Project

This project is a modern flight combat game inspired by Top Gun. It is structured for modular development and easy asset management.

## Directory Structure

- `src/` - Source code
  - `models/` - 3D models
  - `textures/` - Image assets
  - `audio/` - Sound files
  - `components/` - Reusable UI components
  - `utils/` - Helper functions
- `public/` - Static assets (favicon, etc.)
- `dist/` - Build output

## Getting Started

1. Clone the repository and install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run start
   ```
   This will launch the app at [http://localhost:3000](http://localhost:3000) and open it in your browser.
3. Place your assets in the appropriate folders as needed.

## Development Workflow

- **Hot Reloading:** The development server supports hot module replacement (HMR). Any changes to JavaScript or CSS files in `src/` will update in the browser without a full reload.
- **Build for Production:**
   ```sh
   npm run build:prod
   ```
   Bundles and optimizes the app for deployment (output in `dist/`).
- **Linting and Formatting:**
   ```sh
   npm run lint
   npm run lint:fix
   ```
   Ensures code quality and formatting.

---

## AI Difficulty & Rubber-Banding System

This project features a modular, scalable AI difficulty system with dynamic rubber-banding:

- **DifficultyManager** (`src/ai/DifficultyManager.js`): Central API for difficulty presets and runtime parameter overrides.
- **PlayerPerformanceTracker** (`src/ai/PlayerPerformanceTracker.js`): Tracks player stats (accuracy, kills, deaths, damage, streaks, etc.) for dynamic scaling.
- **RubberBandManager** (`src/ai/RubberBandManager.js`): Adjusts AI parameters on the fly based on player performance, ensuring a fair and engaging challenge.

### Debugging & Visualization
- Enable real-time AI debug logs and overlays by setting `window.DEBUG_AI_STATE = true` in the browser console.
- All parameter changes and rubber-banding events are logged when debug mode is active.

### Testing
- Automated Jest tests cover all core AI scaling logic. Run tests with:
  ```sh
  npm test
  ```
- Test files are located in `src/ai/__tests__/`.

### Extending the AI System
- To add a new difficulty parameter:
  1. Add it to `src/ai/difficultyConfig.js` for each preset.
  2. Update `DifficultyManager` to support runtime overrides if needed.
  3. Optionally, extend `RubberBandManager` to adjust the new parameter.
  4. Add/modify tests to cover the new logic.
- For new AI behaviors:
  - Extend `PlayerPerformanceTracker` to track new player actions.
  - Integrate new logic in `EnemyAIStates` or related modules.

---

## Onboarding Guide for New Contributors

1. **Install dependencies and run tests:**
   ```sh
   npm install
   npm test
   ```
2. **Understand the AI system:**
   - Read the top-level comments in `DifficultyManager.js`, `PlayerPerformanceTracker.js`, and `RubberBandManager.js`.
   - Review the tests in `src/ai/__tests__/` for usage examples and expected behaviors.
3. **Debugging:**
   - Use `window.DEBUG_AI_STATE = true` for real-time AI parameter and state inspection.
4. **Adding features:**
   - Follow the expansion checklist in this README to add new parameters or behaviors.
   - Document new code with clear comments and tests.
5. **Questions?**
   - See the `tasks/` directory for roadmap and phase breakdowns.
   - Ask the project maintainer for additional onboarding resources or support.

For more information, see the tasks in the `tasks/` directory.
