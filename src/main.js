/**
 * Main entry point for the 3D Model Viewer application
 * Optimized with lazy loading for better performance
 */

// Lazy load ModelViewer to improve initial load time
let ModelViewer;

// Performance monitoring
const performanceMarks = {
    start: performance.now(),
    domReady: null,
    moduleLoaded: null,
    initialized: null
};

// Future-proof initialization with comprehensive error handling and lazy loading
document.addEventListener('DOMContentLoaded', async () => {
    performanceMarks.domReady = performance.now();
    
    // Lazy load ModelViewer module
    try {
        const module = await import('./ModelViewer.js');
        ModelViewer = module.ModelViewer;
        performanceMarks.moduleLoaded = performance.now();
    } catch (error) {
        console.error('Failed to load ModelViewer module:', error);
        showLoadingError('Failed to load core modules');
        return;
    }
    // Check browser compatibility first
    if (!checkBrowserCompatibility()) {
        showCompatibilityError();
        return;
    }

    try {
        // Show loading message
        const loadingText = document.querySelector('#loadingScreen p');
        if (loadingText) {
            loadingText.innerHTML = '🚀 Preparing your 3D experience...';
        }

        // Add progress tracking
        let initProgress = 0;
        const updateProgress = (message) => {
            initProgress += 20;
            if (loadingText) {
                loadingText.innerHTML = `${message} (${initProgress}%)`;
            }
        };

        updateProgress('🔧 Initializing core systems...');

        // Create and initialize the model viewer with timeout
        const modelViewer = new ModelViewer();
        
        // Set a reasonable timeout for initialization
        const initPromise = modelViewer.init();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000)
        );

        updateProgress('🎮 Setting up 3D engine...');
        await Promise.race([initPromise, timeoutPromise]);
        
        updateProgress('🎨 Loading interface...');
        
        // Make it globally accessible for legacy compatibility
        window.modelViewer = modelViewer;
        
        updateProgress('✅ Ready to use!');
        
        // Silent initialization complete
        
        // Hide loading screen after a brief delay
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }, 500);
        
    } catch (error) {
        console.error('Failed to initialize 3D Model Viewer:', error);
        showInitializationError(error);
    }
});

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility() {
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        return false;
    }

    // Check for required APIs
    const requiredAPIs = [
        'fetch',
        'Promise',
        'Map',
        'Set',
        'WeakMap',
        'requestAnimationFrame'
    ];

    return requiredAPIs.every(api => window[api]);
}

/**
 * Show compatibility error
 */
function showCompatibilityError() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #ff4444; max-width: 500px; margin: 0 auto;">
                <h2>🚫 Browser Not Supported</h2>
                <p>Your browser doesn't support the required features for this 3D viewer.</p>
                <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: left;">
                    <strong>Requirements:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>WebGL support</li>
                        <li>Modern JavaScript (ES6+)</li>
                        <li>Chrome 60+, Firefox 55+, Safari 12+, or Edge 79+</li>
                    </ul>
                </div>
                <p style="font-size: 0.9em;">Please update your browser or try a different one.</p>
            </div>
        `;
    }
}

/**
 * Show initialization error with helpful information
 */
function showInitializationError(error) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        let suggestions = '';

        // Provide specific suggestions based on error type
        if (error.message.includes('WebGL')) {
            suggestions = `
                <div style="margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <strong>WebGL Issue:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                        <li>Enable hardware acceleration in browser settings</li>
                        <li>Update your graphics drivers</li>
                        <li>Try a different browser</li>
                    </ul>
                </div>
            `;
        } else if (error.message.includes('timeout')) {
            suggestions = `
                <div style="margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <strong>Loading Timeout:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                        <li>Check your internet connection</li>
                        <li>Disable browser extensions</li>
                        <li>Clear browser cache and reload</li>
                    </ul>
                </div>
            `;
        }

        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #ff4444; max-width: 600px; margin: 0 auto;">
                <h2>❌ Initialization Failed</h2>
                <p>There was an error starting the 3D viewer.</p>
                ${suggestions}
                <details style="margin: 20px 0; text-align: left;">
                    <summary style="cursor: pointer; color: #ccc;">Technical Details</summary>
                    <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-size: 0.8em; overflow: auto; margin-top: 10px;">${error.message}\n\n${error.stack || ''}</pre>
                </details>
                <div style="margin-top: 20px;">
                    <button onclick="location.reload()" style="margin: 5px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reload Page
                    </button>
                    <button onclick="window.open('https://get.webgl.org/', '_blank')" style="margin: 5px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Test WebGL
                    </button>
                </div>
            </div>
        `;
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.modelViewer) {
        window.modelViewer.destroy();
    }
});

/**
 * Performance monitoring and reporting
 */
function reportPerformanceMetrics() {
    performanceMarks.initialized = performance.now();
    
    const metrics = {
        domReady: performanceMarks.domReady - performanceMarks.start,
        moduleLoad: performanceMarks.moduleLoaded - performanceMarks.domReady,
        initialization: performanceMarks.initialized - performanceMarks.moduleLoaded,
        total: performanceMarks.initialized - performanceMarks.start
    };
    
    console.log('🚀 Performance Metrics:', {
        'DOM Ready': `${metrics.domReady.toFixed(2)}ms`,
        'Module Load': `${metrics.moduleLoad.toFixed(2)}ms`,
        'Initialization': `${metrics.initialization.toFixed(2)}ms`,
        'Total Load Time': `${metrics.total.toFixed(2)}ms`
    });
    
    // Report to analytics if available
    if (window.gtag) {
        window.gtag('event', 'timing_complete', {
            name: 'load',
            value: Math.round(metrics.total)
        });
    }
    
    // Web Vitals reporting
    if ('web-vitals' in window) {
        window.webVitals.getCLS(console.log);
        window.webVitals.getFID(console.log);
        window.webVitals.getFCP(console.log);
        window.webVitals.getLCP(console.log);
        window.webVitals.getTTFB(console.log);
    }
}

/**
 * Show loading error with retry option
 */
function showLoadingError(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: white;">
                <h2>⚠️ Loading Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    background: white; color: #667eea; border: none; 
                    padding: 10px 20px; border-radius: 5px; margin-top: 20px;
                    cursor: pointer; font-size: 16px;
                ">Retry</button>
            </div>
        `;
    }
}