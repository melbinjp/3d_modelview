# Manual Testing Guide for 3D Model Viewer Pro

## Quick Start Testing

### 1. Build and Start
```bash
npm run build
npm start
```

### 2. Open Browser
- Go to `http://localhost:8080`
- Open Developer Tools (F12) → Console tab

### 3. Test Each Step

#### Step A: Page Load
- ✅ Page loads without red console errors
- ✅ Loading screen appears then disappears
- ✅ Main interface visible with canvas and sidebar

#### Step B: Sample Models
- ✅ Click "Helmet" → model loads and is visible
- ✅ Click "Duck" → model loads (check if visible without resize)
- ✅ Click "Avocado" → model loads and is visible

#### Step C: URL Loading
- ✅ Enter URL in input field
- ✅ Click "Load Model" → loads without errors

#### Step D: Controls
- ✅ Auto-rotate checkbox works
- ✅ Sliders respond smoothly
- ✅ No console errors when using controls

## Common Issues to Fix

### CSS Issues
- Missing `analysis.css` or `file-manager.css` (404 errors)
- Broken @import statements in styles.css

### JavaScript Issues  
- Module import errors
- Three.js loader failures
- WebGL context problems

### Model Loading Issues
- CORS errors for external model URLs
- Duck model visibility (resize bug)
- Loader compatibility problems

## After Each Fix
1. `npm run build`
2. Hard refresh browser (Ctrl+F5)
3. Retest the specific issue
4. Check console is clean

## Success Criteria
- No red console errors
- All sample models load correctly
- Duck visible without resize trick
- Smooth, professional UI experience