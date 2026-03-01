/**
 * @jest-environment jsdom
 */

import { ModelViewer } from '../src/ModelViewer.js';

describe('ModelViewer Integration', () => {
  let modelViewer;

  beforeEach(async () => {
    // Set up our document body
    document.body.innerHTML = `
      <div id="mainContainer" class="hidden"></div>
      <div id="loadingScreen"><p></p></div>
      <div id="viewerContainer"></div>
    `;

    modelViewer = new ModelViewer();
    await modelViewer.init();
  });

  afterEach(() => {
    if (modelViewer && typeof modelViewer.destroy === 'function') {
      modelViewer.destroy();
    }
    document.body.innerHTML = '';
  });

  it('should initialize and create a ModelViewer instance', () => {
    expect(modelViewer).toBeDefined();
    expect(modelViewer.initialized).toBe(true);
  });

  it('should have a core engine with registered modules', () => {
    expect(modelViewer.core).toBeDefined();
    expect(modelViewer.core.getModule('rendering')).toBeDefined();
    expect(modelViewer.core.getModule('assets')).toBeDefined();
    expect(modelViewer.core.getModule('ui')).toBeDefined();
    expect(modelViewer.core.getModule('export')).toBeDefined();
    expect(modelViewer.core.getModule('analysis')).toBeDefined();
  });

  it('should have a rendering engine with a scene and camera', () => {
    const renderingEngine = modelViewer.core.getModule('rendering');
    expect(renderingEngine).toBeDefined();
    expect(renderingEngine.scene).toBeDefined();
    expect(renderingEngine.camera).toBeDefined();
  });
});
