---
inclusion: always
---

# Architecture & File Organization Rules

## Mandatory Architecture Pattern

### Dependency Injection with CoreEngine
ALL modules must follow this exact pattern - no exceptions:

```javascript
class ModuleName {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
    }

    async initialize() {
        // Setup logic here
        this.coreEngine.on('eventName', this.handleEvent.bind(this));
        this.initialized = true;
    }

    destroy() {
        // Cleanup ALL resources and event listeners
        this.coreEngine.off('eventName', this.handleEvent);
        this.initialized = false;
    }
}
```

## Strict File Organization

### Source Directory Structure (`src/`)
```
src/
├── main.js                    # Entry point - module registration only
├── ModelViewer.js            # Main orchestrator class
├── core/                     # CoreEngine, ErrorManager, PerformanceMonitor, WebGLRecovery
├── rendering/                # RenderingEngine, ShaderManager, PostProcessingManager, MaterialManager
├── assets/                   # AssetManager, LoaderRegistry, TextureManager, OnlineLibraryManager
├── ui/                       # UIManager, ExportPanel, FileManagerPanel, NotificationSystem
├── performance/              # PerformanceManager, LODManager, CullingManager, MemoryManager
├── cinematic/                # CinematicEngine, CameraSequenceLibrary, LightingDirector
├── analysis/                 # AnalysisManager for measurement tools
├── export/                   # ExportSystem for sharing functionality
├── physics/                  # PhysicsEngine for simulation
└── xr/                       # WebXRManager for VR/AR support
```

### Naming Conventions (STRICT)
- **Classes**: PascalCase with specific suffixes:
  - `Manager` for orchestrators (UIManager, AssetManager)
  - `Engine` for core systems (RenderingEngine, CinematicEngine)  
  - `System` for utilities (ExportSystem, NotificationSystem)
- **Files**: Must match class names exactly (UIManager.js, not ui-manager.js)
- **Tests**: kebab-case with `.test.js` suffix (ui-manager.test.js)
- **Demos**: kebab-case HTML in root, JS in `examples/` folder

### CSS Co-location Rules
- **Global styles**: `styles.css` in root only
- **Module styles**: Adjacent to module (e.g., `src/ui/file-manager.css`)
- **Import in module**: CSS imported in corresponding JS file

## Event System Protocol

### Required Event Patterns
```javascript
// Standard event emission
this.coreEngine.emit('eventName', { 
    data: value, 
    source: this.constructor.name,
    timestamp: Date.now()
});

// Event listener registration (in initialize())
this.coreEngine.on('eventName', this.handleEvent.bind(this));

// Event cleanup (in destroy() - MANDATORY)
this.coreEngine.off('eventName', this.handleEvent);
```

### Standard Event Names
- **Lifecycle**: `moduleInitialized`, `moduleDestroyed`
- **Assets**: `modelLoaded`, `textureLoaded`, `loadingProgress`, `loadingError`
- **UI**: `controlsChanged`, `panelToggled`, `exportRequested`
- **Performance**: `performanceUpdate`, `qualityChanged`, `memoryWarning`
- **Cinematic**: `sequenceStarted`, `cameraTransition`, `effectTriggered`

## Error Handling Protocol

### Mandatory Error Pattern
```javascript
try {
    await this.riskyOperation();
} catch (error) {
    // ALWAYS emit error events
    this.coreEngine.emit('error', {
        type: 'OperationError',
        message: error.message,
        context: { 
            module: this.constructor.name,
            operation: 'riskyOperation',
            timestamp: Date.now()
        }
    });
    
    // Re-throw if critical
    if (this.isCriticalError(error)) {
        throw error;
    }
}
```

### Required Error Handling
- **WebGL operations**: Check `renderer.getContext().isContextLost()`
- **File operations**: Validate file types and sizes before processing
- **Network requests**: Implement exponential backoff retry logic
- **Memory operations**: Monitor and cleanup Three.js objects

## Testing Structure Requirements

### Test File Organization
```
test/
├── [feature-name].test.js     # Unit tests for individual modules
├── integration/               # Cross-module functionality tests
├── browser/                   # Puppeteer UI interaction tests
└── performance/               # Memory and rendering benchmarks
```

### Mandatory Test Pattern
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
        if (module) {
            module.destroy();
        }
        if (coreEngine) {
            coreEngine.destroy();
        }
    });
    
    // Tests here
});
```

## Module Creation Checklist

When creating new modules, verify ALL items:

1. ✅ Constructor accepts `coreEngine` parameter
2. ✅ Async `initialize()` method with event listeners
3. ✅ `destroy()` method removes ALL listeners and cleans up resources
4. ✅ Try/catch blocks around ALL async operations
5. ✅ Events emitted for state changes and errors
6. ✅ Corresponding test file with full coverage
7. ✅ JSDoc comments for all public methods
8. ✅ CSS file co-located if UI component
9. ✅ File name matches class name exactly
10. ✅ Follows naming convention for class suffix