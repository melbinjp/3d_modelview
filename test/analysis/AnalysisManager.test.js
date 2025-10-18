/**
 * @jest-environment jsdom
 */

import { AnalysisManager } from '../../src/analysis/AnalysisManager.js';
import { ModelViewer } from '../../src/ModelViewer.js';
import * as THREE from 'three';

describe('AnalysisManager', () => {
  let analysisManager;
  let modelViewer;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="mainContainer" class="hidden"></div>
      <div id="loadingScreen"><p></p></div>
      <div id="viewerContainer"></div>
      <button id="superheroBtn"></button>
      <button id="superheroPlay"></button>
      <button id="superheroPause"></button>
      <button id="superheroReset"></button>
      <div id="audioDrop"></div>
      <input id="audioInput" type="file" />
      <button id="clearAudio"></button>
    `;
    modelViewer = new ModelViewer();
    await modelViewer.init();
    analysisManager = new AnalysisManager(modelViewer.core);
  });

  afterEach(() => {
    if (modelViewer && typeof modelViewer.destroy === 'function') {
      modelViewer.destroy();
    }
    document.body.innerHTML = '';
  });

  it('should initialize correctly', () => {
    expect(analysisManager).toBeDefined();
  });

  it('should calculate model statistics correctly', () => {
    const model = new THREE.Object3D();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    model.add(mesh);

    const stats = analysisManager.calculateModelStatistics(model);

    expect(stats.vertices).toBe(24);
    expect(stats.faces).toBe(12);
    expect(stats.materials.size).toBe(1);
    expect(stats.textures.size).toBe(0);
    expect(stats.meshes).toBe(1);
  });
});
