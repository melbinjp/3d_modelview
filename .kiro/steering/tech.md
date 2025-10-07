---
inclusion: always
---

# Technology Stack & Development Standards

## Core Technology Stack

### Required Dependencies
- **Three.js v0.164.1**: Primary 3D graphics library - use for all WebGL operations
- **Vanilla JavaScript ES6+**: No framework dependencies - use classes, modules, async/await
- **Webpack 5**: Module bundler - entry point is `src/main.js`, output to `dist/bundle.js`
- **Karma + Jasmine**: Testing framework - all tests must pass before deployment

### Build System Commands
```bash
npm run build    # Production build (required before deployment)
npm start        # Development server (builds then serves)
npm test         # Run all tests (use for validation)
```

## Code Style Requirements

### JavaScript Standards
- **ES6+ syntax only**: Use classes, arrow functions, destructuring, template literals
- **Async/await pattern**: Never use callbacks or raw Promises for async operations
- **Strict error handling**: Wrap all async operations in try/catch blocks
- **JSDoc comments**: Required for all public methods and classes

### Module Pattern (MANDATORY)
```javascript
// All modules must follow this exact pattern
class ModuleName {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
    }

    async initialize() {
        // Setup logic here
        this.initialized = true;
    }

    destroy() {
        // Cleanup logic here
        this.initialized = false;
    }
}
```

### WebGL & Performance Rules
- **Memory management**: Always call `dispose()` on Three.js objects in destroy() methods
- **WebGL context**: Check for context loss before WebGL operations
- **Performance monitoring**: Use `PerformanceMonitor` for tracking frame rates and memory
- **Adaptive quality**: Implement LOD and culling for performance optimization

## Architecture Constraints

### Dependency Injection Pattern
- All modules receive `coreEngine` instance in constructor
- Never create direct dependencies between modules
- Use CoreEngine's event system for inter-module communication

### Event-Driven Communication
```javascript
// Emit events for state changes
this.coreEngine.emit('eventName', data);

// Listen to events in initialize()
this.coreEngine.on('eventName', this.handleEvent.bind(this));

// Remove listeners in destroy()
this.coreEngine.off('eventName', this.handleEvent);
```

### Error Handling Protocol
```javascript
try {
    await riskyOperation();
} catch (error) {
    this.coreEngine.emit('error', {
        type: 'OperationError',
        message: error.message,
        context: { module: this.constructor.name }
    });
}
```

## Testing Requirements
- **Unit tests**: Required for all new modules in `test/[feature].test.js`
- **Integration tests**: Required for cross-module functionality
- **Browser compatibility**: Test in Chrome, Firefox, Safari, Edge
- **Performance tests**: Include memory and rendering benchmarks