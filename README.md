# 3D Model Viewer Pro

<div align="center">
  <h3>🎯 Professional 3D Model Viewer with Advanced Controls</h3>
  <p>A cutting-edge, production-ready 3D model viewer built with modern web technologies</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-username/3d-model-viewer-pro)
  [![WebGL](https://img.shields.io/badge/WebGL-2.0-green.svg)](https://www.khronos.org/webgl/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-purple.svg)](https://web.dev/progressive-web-apps/)
</div>

## ✨ What's New in v2.0

- 🎨 **Modern UI/UX**: Complete interface redesign with glassmorphism effects
- 🚀 **PWA Support**: Install as a native app on any device
- 🎭 **Post-Processing**: Bloom effects and advanced rendering pipeline
- 📱 **Mobile First**: Optimized for touch devices with gesture controls
- 🔄 **Animation System**: Full GLTF animation support with timeline controls
- 📊 **Performance Metrics**: Real-time FPS and model statistics
- 🌐 **Offline Mode**: Works without internet connection
- 🎯 **Production Ready**: Enterprise-grade code quality and architecture

## 🌟 Key Features

### 🎮 Interactive Experience
- **Multi-Format Support**: GLB, GLTF, FBX, OBJ, DAE, STL, PLY with drag & drop
- **Advanced Controls**: Orbit, zoom, pan with smooth damping
- **Auto-Rotation**: Configurable speed and direction
- **Camera Presets**: Reset and fit-to-view functionality

### 🎨 Visual Excellence
- **Dynamic Lighting**: Ambient and directional light controls
- **Post-Processing**: Bloom, FXAA, and tone mapping
- **Environment Options**: Gradient, solid, and HDRI backgrounds
- **Shadow Mapping**: High-quality real-time shadows

### 🔬 Analysis & Measurement
- **Model Statistics**: Vertices, faces, materials, textures, and more
- **Measurement Tools**: Distance, angle, and area measurement
- **Material Inspector**: View and inspect material properties
- **Model Comparison**: Side-by-side comparison of two models

### 🎬 Presentation Mode
- **Camera Presets**: Front, back, left, right, top, bottom, and isometric views
- **Lighting Presets**: Studio, outdoor, dramatic, and soft lighting
- **Auto-Transition**: Automatically transition between camera views
- **Smooth Transitions**: Smoothly animate between camera views

### 📱 Cross-Platform
- **Responsive Design**: Seamless experience on all devices
- **Touch Optimized**: Native mobile gestures
- **PWA Ready**: Install on home screen
- **Offline Capable**: Service worker caching

### 🔧 Developer Friendly
- **Modern Architecture**: ES6+ classes and modules
- **Performance Optimized**: 60fps on desktop, 30fps on mobile
- **Error Handling**: Comprehensive error boundaries
- **Extensible**: Easy to customize and extend

## 🚀 Quick Start

### Local Development
1. Clone the repository: `git clone https://github.com/your-username/3d-model-viewer-pro.git`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Open `http://localhost:8080` in your browser.

### Production Build
1. Install dependencies: `npm install`
2. Run the build script: `npm run build`
3. Deploy the contents of the `dist` directory to your web server.

## 🎯 Usage Guide

### Loading Models
1. **URL Method**: Paste a direct link to your 3D model
2. **File Upload**: Drag & drop or click to browse local files
3. **Supported Formats**: .glb, .gltf, .fbx, .obj

### Navigation Controls
- **Rotate**: Left mouse button or single finger drag
- **Zoom**: Mouse wheel or pinch gesture
- **Pan**: Right mouse button or two finger drag
- **Reset**: Use camera reset button in controls

### Advanced Features
- **Lighting**: Adjust ambient and directional lighting
- **Effects**: Enable bloom and other post-processing
- **Animation**: Control model animations if available
- **Export**: Take high-quality screenshots

## 📋 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 51+ | ✅ Fully Supported |
| Firefox | 51+ | ✅ Fully Supported |
| Safari | 10+ | ✅ Fully Supported |
| Edge | 79+ | ✅ Fully Supported |
| Mobile | WebGL | ✅ Optimized |

## 🏗️ Project Structure

The project is organized into the following directories:

- **`dist/`**: The production-ready build of the application.
- **`src/`**: The source code of the application.
  - **`core/`**: The core engine and error handling.
  - **`rendering/`**: The Three.js rendering and post-processing.
  - **`assets/`**: The asset loading and management.
  - **`ui/`**: The user interface components.
  - **`analysis/`**: The measurement and analysis tools.
  - **`export/`**: The exporting functionality.
  - **`performance/`**: The performance monitoring and optimization.
  - **`editing/`**: The model editing features.
  - **`cinematic/`**: The cinematic camera sequences.
  - **`physics/`**: The physics engine integration.
  - **`xr/`**: The WebXR (VR/AR) integration.
- **`test/`**: The test suite.
  - **`mocks/`**: The mock files for the test suite.
- **`public/`**: The static assets, such as the `index.html` file.

## 📦 Build Process

The project uses Webpack to build the application. The following scripts are available in the `package.json` file:

- **`npm start`**: Starts the development server.
- **`npm run build`**: Creates a production-ready build of the application in the `dist` directory.
- **`npm test`**: Runs the test suite.

## 🔧 Configuration

### Performance Settings
```javascript
// Adjust quality settings in script.js
const QUALITY_SETTINGS = {
  LOW: { shadows: false, bloom: false, antialias: false },
  MEDIUM: { shadows: true, bloom: false, antialias: true },
  HIGH: { shadows: true, bloom: true, antialias: true }
};
```

### Customization
```css
/* Modify theme colors in styles.css */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 🚀 GitHub Pages Deployment

**Super Simple - No Build Required!**

1. **Fork this repository** or create your own
2. **Push your code** to the main branch
3. **Go to Settings > Pages** in your GitHub repository
4. **Select "Deploy from a branch"** and choose "main"
5. **Your site is live!** at `https://yourusername.github.io/repositoryname`

See [DEPLOYMENT.md](DEPLOYMENT.md) for other hosting options.

## 📊 Performance

- **Initial Load**: < 3 seconds
- **Model Loading**: Depends on file size and network
- **Rendering**: 60 FPS on desktop, 30 FPS on mobile
- **Memory Usage**: Optimized for large models

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) - 3D graphics library
- [Khronos Group](https://www.khronos.org/) - GLTF specification
- [WebGL](https://www.khronos.org/webgl/) - 3D graphics API

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the [documentation](docs/)
- Review browser console for error messages

---

<div align="center">
  <p>Made with ❤️ for the 3D web community</p>
  <p>⭐ Star this repo if you find it useful!</p>
</div> 