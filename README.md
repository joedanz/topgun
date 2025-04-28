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

For more information, see the tasks in the `tasks/` directory.
