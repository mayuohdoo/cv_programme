# Resume Autofill Extension

A Safari browser extension that enables one-click autofill of job application forms on company career pages.

## Features

- 📝 Multi-version resume storage and management
- 🔍 Intelligent form field detection
- ⚡ One-click autofill for job applications
- 📊 Application tracking and history
- 🔒 Privacy-first: all data stored locally
- 🎨 Sakura pink theme matching the main application

## Project Structure

```
extension/
├── src/
│   ├── background/       # Background service worker
│   ├── content/          # Content scripts injected into pages
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions and helpers
├── dist/                 # Build output (generated)
├── manifest.json         # Extension manifest
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── webpack.config.js     # Webpack bundler configuration
└── jest.config.js        # Jest testing configuration
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Safari 14+ (for testing)

### Installation

```bash
# Install dependencies
npm install

# Build for development
npm run build:dev

# Build for production
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests only
npm run test:property

# Run unit tests only
npm run test:unit

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Lint TypeScript code
npm run lint

# Type check without emitting files
npm run type-check
```

## Loading the Extension in Safari

1. Build the extension: `npm run build`
2. Open Safari and go to Safari > Preferences > Advanced
3. Enable "Show Develop menu in menu bar"
4. Go to Develop > Allow Unsigned Extensions
5. Go to Safari > Preferences > Extensions
6. Click the "+" button and select the `extension` folder

## Architecture

### Components

- **Background Script**: Manages resume storage, parsing, and extension lifecycle
- **Content Script**: Handles form detection, autofill operations, and page communication
- **Management Panel**: Embedded UI in the web application for resume management

### Communication Flow

```
Web Page (Management Panel)
    ↕ window.postMessage
Content Script
    ↕ chrome.runtime.sendMessage
Background Script
    ↕ chrome.storage.local
Browser Storage
```

## Dependencies

### Core
- `pdfjs-dist`: PDF resume parsing
- `mammoth`: DOCX resume parsing

### Testing
- `jest`: Unit testing framework
- `fast-check`: Property-based testing
- `@playwright/test`: Integration testing

### Build Tools
- `typescript`: Type safety
- `webpack`: Module bundling
- `ts-loader`: TypeScript loader for Webpack

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Production build with minification |
| `npm run build:dev` | Development build with source maps |
| `npm run watch` | Watch mode for development |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:property` | Run property-based tests only |
| `npm run test:unit` | Run unit tests only |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Lint TypeScript code |
| `npm run type-check` | Type check without building |

## Requirements Validated

This project setup validates the following requirements:

- **8.1**: Safari browser version 14 and above support
- **8.2**: Safari browser compatibility
- **8.4**: Browser-agnostic APIs and polyfills

## License

MIT
