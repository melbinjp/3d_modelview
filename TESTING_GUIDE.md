# 3D Model Viewer Pro - Testing Guide

## Quick Start Testing

### 1. Start the Development Server
```bash
npm start
```
This will:
- Build the project
- Start a local server at `http://localhost:8080`
- Open your browser automatically

### 2. Expected Initial State
When the page loads, you should see:
- ✅ A dark gradient background
- ✅ A sidebar on the left with controls
- ✅ A main 3D viewport area
- ✅ No console errors (check F12 Developer Tools)

## Core Features to Test

### 📁 **File Loading (Basic Functionality)**
1. **Drag & Drop Test**:
   - Drag a 3D model file (GLB, GLTF, FBX, OBJ) into the viewport
   - Should see loading progress
   - Model should appear in the center

2. **URL Loading Test**:
   - Click "Load from URL" in sidebar
   - Try: `https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf`
   - Should load the damaged helmet model

3. **Sample Models Test**:
   - Click "Load Sample Model" buttons in sidebar
   - Should load built-in sample models

### 🎮 **Camera Controls**
1. **Mouse Controls**:
   - Left click + drag = Rotate around model
   - Right click + drag = Pan
   - Scroll wheel = Zoom in/out

2. **Camera Buttons**:
   - Click "Reset Camera" - should return to default view
   - Try different camera preset buttons

### 💡 **Lighting System**
1. **Basic Lighting**:
   - Toggle "Auto Rotate" - model should spin
   - Adjust "Ambient Light" slider - should change overall brightness
   - Adjust "Directional Light" - should change shadows

2. **Advanced Lighting** (if available):
   - Try different lighting presets
   - Toggle shadows on/off

### ✨ **Visual Effects**
1. **Bloom Effect**:
   - Toggle "Bloom" checkbox
   - Should add a glowing effect to bright areas

2. **Post-Processing**:
   - Try different effect toggles in sidebar
   - Should see visual changes to the model

### 🎬 **Cinematic Mode (Superhero Mode)**
1. **Activation**:
   - Click the "Superhero Mode" button (should have a cape icon)
   - Should trigger dramatic camera movements
   - Should play epic music (if audio is working)

### 📊 **Analysis Tools**
1. **Measurements**:
   - Look for measurement tools in sidebar
   - Try measuring distances on the model

2. **Model Statistics**:
   - Should show vertex count, face count, etc.
   - Information should update when loading different models

### 📂 **File Management System (NEW!)**
1. **Recent Files**:
   - Load several models
   - Check if they appear in "Recent Files" section
   - Should show thumbnails and metadata

2. **Projects**:
   - Create a new project
   - Add files to the project
   - Should organize files by project

3. **Search**:
   - Search for loaded files by name
   - Filter by file type
   - Should return relevant results

### 📤 **Export Features**
1. **Screenshots**:
   - Click "Take Screenshot" button
   - Should download an image of current view

2. **Model Information**:
   - Export model statistics
   - Should provide detailed model data

## Advanced Testing

### 🔍 **Performance Testing**
1. **Large Models**:
   - Load a complex model (>100MB if available)
   - Should handle gracefully with performance optimizations

2. **Multiple Models**:
   - Load several models in sequence
   - Check memory usage in browser dev tools

### 📱 **Mobile Testing** (if available)
1. **Touch Controls**:
   - Test on mobile device or browser dev tools mobile mode
   - Touch gestures should work for camera control

### 🌐 **Online Features**
1. **Asset Library**:
   - Try searching online model libraries
   - Should connect to external services (may require internet)

## Troubleshooting Common Issues

### ❌ **Model Won't Load**
- Check file format is supported (GLB, GLTF, FBX, OBJ, STL)
- Check browser console for error messages
- Try a different model file

### ❌ **Performance Issues**
- Try disabling post-processing effects
- Check if hardware acceleration is enabled in browser
- Close other browser tabs

### ❌ **Visual Glitches**
- Update graphics drivers
- Try different browser (Chrome recommended)
- Disable browser extensions

### ❌ **Features Not Working**
- Check browser console for JavaScript errors
- Ensure WebGL is supported and enabled
- Try refreshing the page

## Expected Test Results

### ✅ **What Should Work**
- Basic model loading and display
- Camera controls (mouse/touch)
- Basic lighting adjustments
- File management (recent files, projects)
- Screenshot export
- Cinematic mode activation
- Analysis tools (measurements, statistics)

### ⚠️ **What Might Have Issues**
- Some advanced post-processing effects (Three.js compatibility)
- Online asset library (depends on external APIs)
- Complex model animations
- Audio in cinematic mode (browser permissions)

### ❌ **Known Limitations**
- Some newer 3D formats not yet supported
- Advanced material editing (not implemented yet)
- Real-time collaboration (not implemented yet)
- Mobile-specific optimizations (not fully implemented)

## Reporting Issues

If you find problems, please note:
1. **Browser and version** (e.g., Chrome 120)
2. **Operating system** (Windows, Mac, Linux)
3. **Specific steps** to reproduce the issue
4. **Console error messages** (F12 → Console tab)
5. **Model file** that caused issues (if applicable)

## Demo Files Available

You can also test specific features using these demo files:
- `analysis-demo.html` - Analysis tools showcase
- `cinematic-demo.html` - Superhero mode demo
- `file-management-demo.html` - File management system demo
- `advanced-threejs-demo.html` - Advanced rendering features

## Performance Benchmarks

Expected performance on modern hardware:
- **Model Loading**: < 5 seconds for typical models (< 50MB)
- **Frame Rate**: 60 FPS with basic models, 30+ FPS with complex models
- **Memory Usage**: < 500MB for typical usage
- **Startup Time**: < 3 seconds for initial page load

---

**The website should be fully functional for core 3D viewing tasks. The file management system we just implemented adds powerful organization capabilities on top of the existing features.**