# Top Gun AI Developer Documentation

_Last updated: 2025-04-30_

## Overview
This document describes the architecture, features, and implementation details of the AI evasion, threat detection, and maneuvering systems in the Top Gun project. It is intended for developers who wish to understand, extend, or debug the AI combat behavior.

---

## 1. Threat Detection System

### Multi-Threat Awareness
- **Missile Threats:** Detected by scanning all missiles in the scene. Threats are ranked by time-to-impact (TTI), closure rate, and distance.
- **Gunfire Threats:** Detected by scanning all bullets/shells in the scene, considering only those approaching the AI and within a critical range. Ranked by TTI.
- **Player Aiming Threats:** If the player aircraft is aiming within 10° and 1200m, it is treated as a threat (type: `aiming`) and unified into the threat ranking system.
- **Threat Ranking:** All threats are sorted by urgency (lowest TTI first). The AI always responds to the most urgent threat.
- **Threat Memory:** When a threat is detected, a timer is set (default: 2s). The AI remains alert for this duration after threats disappear, preventing premature state transitions.

### Key Methods
- `getThreatSummary()`: Returns an array of all current threats, ranked by urgency.
- `isUnderAttack()`: Returns true if any threat is active or threat memory is running.

---

## 2. Evasion State Machine & Transitions

### States
- **Patrol:** Follows waypoints and scans for threats.
- **Engage:** Pursues and attacks the player if detected.
- **Evade:** Executes evasive maneuvers when under threat.

### Transitions
- **To Evade:** Triggered when `isUnderAttack()` returns true (any threat or threat memory active). Entry is blocked if an evasion cooldown is active.
- **From Evade:** Exits after a minimum evasion time (difficulty-scaled) AND when no threats/memory are active AND (optionally) when a safe distance from the player is achieved. Upon exit, a cooldown timer prevents immediate re-entry.
- **To Engage/Patrol:** Standard transitions when threats are lost or player is out of range.

### Cooldown & Timing
- **Minimum Evasion Time:** Easy: 2.2s, Medium: 1.7s, Hard: 1.0s (configurable).
- **Evasion Cooldown:** Default 1.2s after leaving evade (configurable).
- **Threat Memory:** Default 2.0s after last detected threat.

---

## 3. Evasive Maneuver Library

### Maneuver Types
- **Missile Threats:** Break turn, split-S, barrel roll, Immelmann, vertical/rolling/flat scissors, low/high yo-yo, defensive spiral, cobra, lag displacement roll, pitchback turn, etc.
- **Gunfire Threats:** High-G jink, random jink, break turn, low yo-yo, rolling/flat scissors, lag displacement roll, defensive spiral, pitchback turn.
- **Aiming Threats:** Treated as moderate urgency; maneuvers are selected as for gunfire unless otherwise specified.
- **Energy Management:** If AI energy is low, less energy-intensive maneuvers are prioritized.
- **Terrain Awareness:** All maneuvers check altitude and avoid terrain using raycasts and altitude checks.

### Countermeasures
- **Chaff/Flares:** Deployed probabilistically (difficulty-scaled) when missile threats are detected. Type selected based on missile guidance (radar/IR).

---

## 4. Difficulty Scaling
- **Aggression, minimum evasion time, and countermeasure probability** are all scaled by difficulty (easy/medium/hard).
- **Configurable parameters** (detection range, FOV, reaction time, etc.) are set per AI instance or globally.

---

## 5. Debugging & Logging
- **Debug Labels:** Maneuver names and threat types are shown as overlays in debug mode.
- **Console Logging:** All state transitions, threat detections, maneuver selections, countermeasure deployments, and cooldowns are logged when `window.DEBUG_AI_STATE` is enabled.

---

## 6. Extending & Tuning
- **Threat Types:** To add new threat types, extend `getThreatSummary()` and update maneuver selection logic.
- **Maneuver Library:** To add maneuvers, implement a method and include it in the selection arrays.
- **Tuning:** Adjust timing, thresholds, and probabilities in the config or directly in the state machine and threat logic.

---

## 7. Recent Improvements (Spring 2025)
- Unified threat ranking system (missile, gunfire, aiming)
- Evasion state cooldown to prevent rapid toggling
- Robust debug output for all transitions
- Terrain-aware and energy-aware maneuver selection
- Improved documentation and maintainability

---

## 8. File Reference
- **src/aircraft/EnemyAircraft.js** — Main AI logic, threat detection, maneuvers
- **src/ai/EnemyAIStates.js** — State machine logic for patrol/engage/evade
- **src/aircraft/Aircraft.js** — Base class for all aircraft

---

## 9. Further Reading & TODOs
- Consider further integrating player aiming threat urgency with context (e.g., player weapon type, lock-on, etc.)
- Polish and extend debug overlays for easier visual QA
- Add automated test scenarios for CI

---

_This document will be updated as new features and improvements are added._

---

# TopGun VR/Web Flight Simulator - Developer Documentation

**Last Updated:** {{ CURRENT_DATE_TIME }}

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Core Systems Architecture](#core-systems-architecture)
    *   [Project Structure & Build](#project-structure--build)
    *   [Rendering (Three.js)](#rendering-threejs)
    *   [Physics (Ammo.js)](#physics-ammojs)
    *   [Input System](#input-system)
    *   [UI/HUD System (React)](#uihud-system-react)
3.  [Aircraft Systems](#aircraft-systems)
    *   [Base Aircraft Class](#base-aircraft-class)
    *   [Player Aircraft](#player-aircraft)
    *   [Enemy AI Aircraft](#enemy-ai-aircraft)
4.  [Enemy AI Details](#enemy-ai-details)
    *   [State Machine](#ai-state-machine)
    *   [Patrol State](#patrol-state)
    *   [Detection & Targeting](#detection--targeting)
    *   [Engagement State](#engagement-state)
    *   [Evasion State & Maneuvers](#evasion-state--maneuvers)
    *   [Threat Assessment](#threat-assessment)
    *   [Weapon Handling (AI)](#weapon-handling-ai)
    *   [Countermeasures](#countermeasures)
    *   [Configuration & Debugging](#configuration--debugging)
5.  [Combat Systems (Partially Implemented)](#combat-systems-partially-implemented)
    *   [Weapon Architecture (Planned)](#weapon-architecture-planned)
    *   [Projectile Physics (Planned)](#projectile-physics-planned)
    *   [Hit Detection (Planned)](#hit-detection-planned)
    *   [Damage System (Planned)](#damage-system-planned)
6.  [Setup & Running](#setup--running)
7.  [Future Work & Pending Tasks](#future-work--pending-tasks)

---

## 1. Project Overview

This project is a web-based flight simulator inspired by Top Gun, built using Three.js for 3D rendering, Ammo.js for physics, and React for the UI/HUD. It aims to provide an immersive flight experience with realistic physics, engaging AI opponents, and cross-platform input support.

Key features include:
*   Detailed aircraft physics simulation.
*   Intelligent enemy AI with multiple behavioral states.
*   Responsive UI/HUD for critical flight information.
*   Support for various input methods (keyboard, mouse, touch, tilt, gamepad).
*   Modular architecture for extensibility.

---

## 2. Core Systems Architecture

### Project Structure & Build

*(Based on Task 1)*

*   **Directory Structure:** Organized into `src/` (code), `public/` (static assets), `dist/` (build output), `config/` (build configs). `src/` contains subdirectories like `ai`, `aircraft`, `components`, `input`, `physics`, `three`, `weapons`, `utils`.
*   **Build System:** Uses Webpack (or Rollup) configured via `config/` files.
    *   Handles bundling of JavaScript and assets (models, textures, audio, CSS).
    *   Separate development (`npm run dev` / `yarn dev`) and production (`npm run build` / `yarn build`) builds.
    *   Development build includes hot module replacement (HMR) and source maps.
    *   Production build includes minification, tree shaking, and asset optimization.
*   **Code Quality:** Enforced using ESLint and Prettier, integrated with pre-commit hooks (Husky + lint-staged).
*   **Dev Server:** `webpack-dev-server` (or equivalent) provides live reloading for efficient development.

### Rendering (Three.js)

*(Based on Task 2, `src/three/`, `src/index.js`)*

*   **Core:** Managed by `ThreeEnvironment` class ([src/three/ThreeEnvironment.js](cci:7://file:///Users/danziger/code/games/topgun/src/three/ThreeEnvironment.js:0:0-0:0)). Initializes `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
*   **Canvas:** Renderer attached to a DOM element (`#app`), configured to be responsive to window resizing.
*   **Lighting:** Basic setup with `THREE.AmbientLight` and `THREE.DirectionalLight` (configured for shadows).
*   **Environment:** Skybox implemented using `THREE.CubeTextureLoader` or HDR maps for background and environmental lighting.
*   **Asset Loading:** Uses `THREE.LoadingManager` to handle asynchronous loading of models (GLTF) and textures, with progress tracking.
*   **Render Loop:** Main animation loop driven by `requestAnimationFrame` within `ThreeEnvironment`.
*   **Camera Controls:** `OrbitControls` are available for debugging/development purposes.

### Physics (Ammo.js)

*(Based on Task 3, `src/physics/`)*

*   **Engine:** Uses Ammo.js (WASM port of Bullet Physics).
*   **World Setup:** Initializes `btDefaultCollisionConfiguration`, `btCollisionDispatcher`, `btDbvtBroadphase`, `btSequentialImpulseConstraintSolver`. Gravity can be configured.
*   **Integration:**
    *   Physics simulation runs in a fixed timestep loop, synchronized with the render loop.
    *   Utility functions convert between Three.js (`Vector3`, `Quaternion`) and Ammo.js (`btVector3`, `btQuaternion`) types.
    *   Helper functions synchronize the visual Three.js object transforms with their corresponding Ammo.js rigid body transforms.
*   **Rigid Bodies:** A system exists (likely in `src/physics/PhysicsHelper.js` or similar) to create Ammo.js rigid bodies (`btRigidBody`) from Three.js meshes, calculating mass and inertia. Collision shapes (box, sphere, hull) are generated.
*   **Collision Detection:**
    *   Uses collision groups and masks for filtering.
    *   A callback system likely exists to handle contacts.
    *   Continuous Collision Detection (CCD) might be enabled for fast-moving objects.
*   **Force Application:** Methods exist to apply forces and torques to rigid bodies (e.g., for thrust, control surfaces).
*   **Debugging:** A debug drawer (`AmmoDebugDrawer.js`) allows visualizing Ammo.js collision shapes.

### Input System

*(Based on Task 5, `src/input/`)*

*   **Abstraction Layer:** A central `InputHandler` class likely normalizes inputs from various sources into defined game actions (e.g., 'thrust', 'roll', 'pitch', 'fire', 'nextWeapon', 'pause').
*   **Platform Support:**
    *   **Desktop:** Keyboard (WASD/Arrows for flight, Space for fire, etc.) and Mouse (aiming/camera).
    *   **Mobile:** Touch controls with virtual joysticks and buttons.
    *   **Mobile (Optional):** Device orientation (tilt) controls.
    *   **Gamepad:** Support via the browser Gamepad API.
*   **Configuration:**
    *   A `ControlSettingsMenu` React component ([src/input/ControlSettingsMenu.js](cci:7://file:///Users/danziger/code/games/topgun/src/input/ControlSettingsMenu.js:0:0-0:0)) allows users to adjust sensitivity, select control schemes, and potentially rebind keys/buttons.
    *   Settings are likely saved to `localStorage`.

### UI/HUD System (React)

*(Based on Task 6, `src/components/`, `src/index.js`)*

*   **Framework:** Uses React for building UI components.
*   **Mounting:** React components are mounted onto overlay divs (`#hud-root`, `#targeting-root`, etc.) positioned above the main Three.js canvas (`src/index.js`).
*   **Core HUD:** ([src/components/HUD.js](cci:7://file:///Users/danziger/code/games/topgun/src/components/HUD.js:0:0-0:0))
    *   Displays critical flight data: Speed, Altitude, Health, Current Weapon, Ammo.
    *   Data is typically sourced from `window.playerAircraft`.
*   **Targeting System:** ([src/components/TargetingSystem.js](cci:7://file:///Users/danziger/code/games/topgun/src/components/TargetingSystem.js:0:0-0:0))
    *   Displays the aiming reticle.
    *   Shows indicators for off-screen enemies.
    *   Visualizes lock-on status and progress.
    *   Includes audio cues for lock/hit (requires user interaction to enable sound).
*   **Other UI:**
    *   `MissionObjectives` component displays goals.
    *   `NotificationSystem` shows temporary messages.
    *   `PauseMenu` ([src/components/PauseMenu.js](cci:7://file:///Users/danziger/code/games/topgun/src/components/PauseMenu.js:0:0-0:0)) provides Resume, Restart, Settings, Quit options.
    *   `HitMarker` component provides visual feedback on hits.
    *   `HUDOverlayEffects` handles screen flashes (e.g., damage).
*   **Responsiveness:** UI elements use CSS (Flexbox, Grid, media queries) to adapt to different screen sizes.
*   **Debugging UI:** Several debug components exist (`DebugMenu`, `EnemyDebugLabel`, `EnemyPatrolDebug`, `EnemyFOVDebug`) likely toggled via global flags or the debug menu.

---

## 3. Aircraft Systems

### Base Aircraft Class

*(Based on Task 4, `src/aircraft/Aircraft.js`)*

*   **Core Class:** `Aircraft.js` serves as the base for all flying entities.
*   **Properties:** Manages position, rotation, velocity, acceleration, mass, health, and aircraft type configuration.
*   **Physics Integration:** Each `Aircraft` instance is associated with an Ammo.js rigid body. The class provides methods to apply forces based on control inputs (thrust, roll, pitch, yaw).
*   **State Management:** Includes a basic state system (e.g., NORMAL, DAMAGED, DESTROYED) affecting performance.
*   **Update Loop:** The `update()` method handles applying forces, updating the physics body, and synchronizing the Three.js representation.
*   **Weapons:** Contains an array `this.weapons` and methods like `addWeapon`, `switchWeapon`, `getCurrentWeapon`, `fireWeapon`, `setLockedTarget`.

### Player Aircraft

*(Based on Task 4, `src/aircraft/PlayerAircraft.js` - assuming existence, or it might just use the base `Aircraft` class directly instantiated in `src/index.js`)*

*   Instantiated in `src/index.js` (currently using the base `Aircraft` class).
*   Controlled via the `InputHandler` system.
*   Followed by the `CameraController` ([src/aircraft/CameraController.js](cci:7://file:///Users/danziger/code/games/topgun/src/aircraft/CameraController.js:0:0-0:0) - likely implementation based on Task 4 details) providing different view modes (cockpit, chase) with smoothing.
*   Serves as the data source for the HUD.
*   Exposed globally as `window.playerAircraft`.

### Enemy AI Aircraft

*(Based on Task 4 & 8, `src/aircraft/EnemyAircraft.js`)*

*   **Class:** `EnemyAircraft.js` extends `Aircraft.js`.
*   **AI Control:** Behavior is driven by a `StateMachine` instance (`src/ai/StateMachine.js`).
*   **Initialization:** Takes configuration for AI parameters (detection range, FOV, reaction time, patrol route, performance limits, aim error, etc.).
*   **Update Loop:** Calls `this.stateMachine.update()` in its `update()` method.
*   **Core AI Capabilities:** Includes methods for patrol navigation, target detection, threat assessment, weapon selection/firing, and evasive maneuvers (detailed below).
*   **Spawning:** Can be spawned via `spawnEnemies()` in `src/index.js`.
*   **Global Access:** Enemy instances are stored in `window.enemies`.

---

## 4. Enemy AI Details

*(Based on Task 8, `src/aircraft/EnemyAircraft.js`, `src/ai/EnemyAIStates.js`)*

### AI State Machine

*   **Implementation:** Uses `StateMachine.js` which manages states and transitions.
*   **States:** Core states defined in `EnemyAIStates.js` include:
    *   `Patrol`: Following a waypoint route.
    *   `Engage`: Actively pursuing and attacking a target.
    *   `Evade`: Reacting to immediate threats with defensive maneuvers.
*   **Transitions:** Logic within each state determines when to transition (e.g., `Patrol` -> `Engage` on target detection, `Engage` -> `Evade` on threat detection).

### Patrol State

*   **Navigation:** Follows a defined `patrolRoute` (array of `THREE.Vector3`).
*   **Waypoints:** Uses `getCurrentWaypoint()` and `advanceWaypoint()`.
*   **Steering:** Uses `steerTowards()` to smoothly navigate towards the current waypoint.
*   **Randomization:** Patrol routes can be optionally randomized or perturbed via `setPatrolRoute()`.
*   **Detection:** Continuously scans for targets using `canDetectTarget()`. Transitions to `Engage` if a target is detected and reaction time has passed.

### Detection & Targeting

*   **Detection Method (`canDetectTarget`):** Checks if a target is within `detectionRange` and `fieldOfView`, and performs a Line-of-Sight raycast against `sceneObstacles` if available.
*   **Acquisition (`acquireTarget`):** Selects the highest priority detected target based on scoring (player > angle > distance > health).
*   **Reaction Time:** A `reactionTime` parameter introduces a delay between initial detection and the AI reacting (transitioning to Engage).
*   **Targeting:** The `Engage` state uses `computeInterceptPoint()` for predictive aiming.

### Engagement State

*   **Goal:** Pursue and destroy the `currentTarget`.
*   **Tactics:** Uses `assessTacticalSituation()` to decide between:
    *   Attacking: If `canAttack` is true (good range/angle).
    *   Maneuvering: If `needsManeuver` is true (target in view but poor angle).
*   **Steering:** Uses `steerTowards()` with the `pursuitMode` (lead/lag) and `predictionAccuracy` options.
*   **Firing:** Calls `fireWeaponAtPlayer()` when tactical assessment allows, which handles weapon selection and constraint checks.
*   **Threat Monitoring:** Continuously checks `isUnderAttack()` to potentially transition to `Evade`.

### Evasion State & Maneuvers

*   **Trigger:** Entered when `isUnderAttack()` returns a significant threat.
*   **Maneuver Selection (`startEvasion`):** Chooses a maneuver based on the primary threat type (e.g., 'break' vs missile, 'jink' vs gunfire/aiming) and altitude constraints (`_canPerformNegativePitchManeuver`).
*   **Maneuver Library (`updateEvasion`):** Contains basic implementations for:
    *   Barrel Roll
    *   Break Turn (Left/Right)
    *   Dive Spiral
    *   Jink (randomized small turns)
*   **Duration:** Evasion lasts for a defined time or until the threat diminishes (logic in `EnemyAIStates.js`).
*   **Cooldown:** A cooldown (`evasionCooldownTimer` in `EnemyAIStates.js`) prevents immediate re-entry into Evasion after exiting.

### Threat Assessment

*   **Threat Sources:** Detects threats from:
    *   Incoming Missiles (`getIncomingMissileThreats`): Calculates TTI and closure.
    *   Incoming Gunfire (`getIncomingGunfireThreats`): Placeholder.
    *   Player Aiming (`isPlayerAimingAtMe`): Checks player's aim vector.
*   **Unified Summary (`getThreatSummary`):** Collects all threats, assigns urgency scores (TTI or fixed values), and sorts them by priority.
*   **Threat Memory:** `_threatMemoryTimer` ensures the AI remains aware of recent threats briefly.

### Weapon Handling (AI)

*   **Intercept Calculation (`computeInterceptPoint`):** Sophisticated function predicting target position based on relative motion, projectile speed, optional target acceleration, pursuit mode, and accuracy scaling.
*   **Weapon Selection (`selectWeaponForTarget`):** Selects the optimal weapon based on constraints (range, angle, ammo, cooldown, lock) and context scoring.
*   **Firing Logic (`fireWeaponAtPlayer`):** Orchestrates aiming, weapon selection, constraint checks, aim error injection, and calls the actual weapon `fire()` method.

### Countermeasures

*   **Deployment (`deployCountermeasures`):** Triggered by the `Evade` state.
*   **Type Selection:** Deploys Flares for IR threats, Chaff for Radar threats (based on missile `guidanceType`).
*   **Cooldown:** Manages separate cooldowns for flares and chaff.

### Configuration & Debugging

*   **AI Config:** Parameters like range, FOV, turn rate, accuracy, etc., are passed via the `aiConfig` object during `EnemyAircraft` construction.
*   **Global Flags:** `window.DEBUG_AI_STATE` enables console logging and visual maneuver labels (`_showManeuverLabel`).
*   **Debug UI:** Components like `EnemyDebugLabel`, `EnemyPatrolDebug`, `EnemyFOVDebug` can be used to visualize AI state.

---

## 5. Combat Systems (Partially Implemented)

*(Based on Task 7 status - Pending)*

While the AI (`EnemyAircraft.js`) has logic for selecting and firing weapons, the core weapon implementations themselves are largely pending based on Task 7's status.

### Weapon Architecture (Planned)

*   A base `IWeapon` interface and `BaseWeapon` class are planned.
*   Specific weapon types (MachineGun, Missile, Cannon) inheriting from the base are planned.
*   Weapon configuration (stats, ranges, damage) will be defined.

### Projectile Physics (Planned)

*   A system to handle different projectile types (ballistic, guided) is planned.
*   A `ProjectileManager` for pooling and lifecycle management is intended.

### Hit Detection (Planned)

*   Combination of raycasting (instant hit) and colliders (physical projectiles) is planned.
*   Collision layers and hit info structures are intended.

### Damage System (Planned)

*   Calculation based on weapon type, hit location, distance is planned.
*   Visual/audio feedback (VFX, SFX) for firing and impacts is planned.

---

## 6. Setup & Running

1.  **Prerequisites:** Node.js and npm (or yarn).
2.  **Installation:** Clone the repository and run `npm install` (or `yarn install`).
3.  **Development:** Run `npm run dev` (or `yarn dev`) to start the development server (usually at `http://localhost:8080` or similar).
4.  **Production Build:** Run `npm run build` (or `yarn build`) to create an optimized build in the `dist/` folder.

---

## 7. Future Work & Pending Tasks

Based on the task list review (specifically Tasks 7 & 8):

*   **Complete Weapon Systems (Task 7):** Implement concrete weapon classes, projectile physics, hit detection, and the damage model.
*   **Advanced AI Behaviors (Task 8):**
    *   Implement AI weapon tracking and firing logic fully (depends on Task 7).
    *   Expand the evasive maneuver library and refine selection logic.
    *   Implement formation flying capabilities.
    *   Develop comprehensive difficulty scaling across all AI aspects.
*   **Missions & Gameplay:** Define specific mission structures, win/loss conditions, and scoring.
*   **Asset Integration:** Replace placeholder models/textures with final game assets.
*   **Audio:** Implement a full audio system with sound effects and potentially music.
*   **Optimization:** Profile and optimize rendering, physics, and AI performance for target devices.
