---
inclusion: always
---

# Development Guide for 3D Model Viewer

## Mandatory Architecture Pattern

### Module Structure (STRICT)
Every module MUST follow this exact pattern:

```javascript
class ModuleName {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
    }

    async initialize() {
        // Setup and register event listeners
        this.coreEngine.on('eventName', this.handleEvent.bind(this));
        this.initialized = true;
    }

    destroy() {
        // CRITICAL: Remove ALL listeners and dispose Three.js objects
        this.coreEngine.off('eventName', this.handleEvent);
        this.initialized = false;
    }
}
```

### Communication Rules
- **No direct module dependencies** - use CoreEngine events only
- **Event pattern**: `this.coreEngine.emit('eventName', data)` for state changes
- **Standard events**: `modelLoaded`, `loadingError`, `performanceUpdate`, `qualityChanged`

## File Organization (STRICT)

### Directory Structure
```
src/
├── main.js              # Entry point only
├── ModelViewer.js       # Main orchestrator
├── core/               # CoreEngine, ErrorManager, PerformanceMonitor
├── rendering/          # RenderingEngine, ShaderManager, MaterialManager
├── assets/             # AssetManager, LoaderRegistry, TextureManager
├── ui/                 # UIManager, panels, NotificationSystem
├── performance/        # PerformanceManager, LODManager, CullingManager
├── cinematic/          # CinematicEngine, camera sequences
├── analysis/           # AnalysisManager for measurements
├── export/             # ExportSystem for sharing
├── physics/            # PhysicsEngine for simulation
└── xr/                 # WebXRManager for VR/AR
```

### Naming Rules
- **Classes**: PascalCase + suffix (`Manager`, `Engine`, `System`)
- **Files**: Exact class name match (UIManager.js, not ui-manager.js)
- **Tests**: kebab-case + `.test.js` (ui-manager.test.js)
- **CSS**: Co-located with modules (src/ui/file-manager.css)

## Technology Requirements

### Stack
- **Three.js v0.164.1**: Primary 3D library
- **Vanilla JavaScript ES6+**: No frameworks
- **Webpack 5**: Entry `src/main.js` → `dist/bundle.js`
- **Karma + Jasmine**: Testing

### Build Commands
```bash
npm run build    # Production build (required before deployment)
npm start        # Development server
npm test         # Run tests (required before commits)
```

## Code Standards

### JavaScript Rules
- ES6+ only: classes, async/await, destructuring, template literals
- JSDoc comments for all public methods
- Wrap ALL async operations in try/catch blocks

### Error Handling (MANDATORY)
```javascript
try {
    await this.operation();
} catch (error) {
    this.coreEngine.emit('error', {
        type: 'OperationError',
        message: error.message,
        context: { module: this.constructor.name }
    });
    if (this.isCritical(error)) throw error;
}
```

### WebGL Memory Management
- Call `dispose()` on ALL Three.js objects in `destroy()`
- Check `renderer.getContext().isContextLost()` before WebGL ops
- Use `PerformanceMonitor` for tracking
- Implement LOD and culling for performance

## Testing Requirements

### Test Pattern (MANDATORY)
```javascript
describe('ModuleName', () => {
    let coreEngine, module;
    
    beforeEach(async () => {
        coreEngine = new CoreEngine();
        await coreEngine.initialize();
        module = new ModuleName(coreEngine);
        await module.initialize();
    });
    
    afterEach(async () => {
        if (module) module.destroy();
        if (coreEngine) coreEngine.destroy();
    });
});
```

### Coverage Requirements
- Unit tests for all modules in `test/[feature].test.js`
- Integration tests for cross-module functionality
- Performance benchmarks included

## Model Format Support (Priority Order)
1. **GLB/GLTF**: Primary format (animations, PBR materials)
2. **FBX**: Secondary (convert to GLB preferred)
3. **OBJ**: Basic geometry only
4. **STL**: 3D printing models

## Performance Targets
- Models <50MB: Load within 5 seconds
- Frame rate: 60fps desktop, 30fps mobile minimum
- UI response: <100ms for all interactions
- Memory: Automatic cleanup on model switch

## AI Assistant Rules

### Critical Requirements
1. **Always use the exact module pattern** - no exceptions
2. **Never create direct module dependencies** - use CoreEngine events
3. **Always implement proper cleanup** - WebGL memory leaks are critical
4. **Test changes with `npm test`** - required before completion
5. **Maintain backward compatibility** - especially superhero mode
6. **Follow file naming exactly** - class name = file name

### Module Creation Checklist
- [ ] Constructor accepts `coreEngine` parameter
- [ ] Async `initialize()` with event listeners
- [ ] `destroy()` removes ALL listeners and disposes resources
- [ ] Try/catch around ALL async operations
- [ ] Events emitted for state changes and errors
- [ ] Test file with full coverage
- [ ] JSDoc comments for public methods
- [ ] CSS co-located if UI component
- [ ] File name matches class name exactly