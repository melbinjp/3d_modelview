// test/mocks/three.js

const MockVector3 = class {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
  set() { return this; }
  clone() { return new MockVector3(); }
  multiplyScalar() { return this; }
};

const MockClock = class {
  constructor() {}
  getDelta() { return 0; }
  getElapsedTime() { return 0; }
};

const MockOrbitControls = class {
  constructor() {}
  update() {}
};

const MockBox3 = class {
  constructor() {
    this.min = new MockVector3();
    this.max = new MockVector3();
  }
  setFromObject() { return this; }
  getSize() { return new MockVector3(); }
  getCenter() { return new MockVector3(); }
};

const MockObject3D = class {
  constructor() {
    this.children = [];
  }
  add(child) {
    this.children.push(child);
  }
  traverse(callback) {
    callback(this);
    this.children.forEach(child => child.traverse(callback));
  }
};

const MockBoxGeometry = class extends MockObject3D {
  constructor() {
    super();
    this.attributes = {
      position: {
        count: 24,
        array: new Float32Array(72),
      },
    };
    this.index = {
      count: 36,
      array: new Uint16Array(36),
    };
  }
};

const MockClass = class extends MockObject3D {
  constructor() {
    super();
    this.position = new MockVector3();
    this.material = { transparent: false, opacity: 0 };
    this.rotation = { x: 0 };
    this.shadow = { mapSize: { width: 0, height: 0 }, camera: {} };
    this.isMesh = true;
    this.geometry = new MockBoxGeometry();
  }
  set() { return this; }
  copy() { return this; }
  setFromObject() { return this; }
  getCenter() { return new MockVector3(); }
  getBoundingSphere() { return { radius: 0 }; }
  lookAt() { return this; }
  updateProjectionMatrix() { return this; }
  setSize() { return this; }
  setPixelRatio() { return this; }
  appendChild() { return this; }
  get domElement() { return document.createElement('canvas'); }
  get shadowMap() { return {}; }
  render() {}
  dispose() {}
  stopAllAction() {}
  clipAction() { return { play: () => {} }; }
  update() {}
  addPass() {}
  setTranscoderPath() {}
  setPath() {}
  getSize() { return { width: 0, height: 0 }; }
  clone() { return this; }
};

const three = {
  WebGLRenderer: MockClass,
  OrbitControls: MockOrbitControls,
  EffectComposer: MockClass,
  RenderPass: MockClass,
  UnrealBloomPass: MockClass,
  Scene: MockClass,
  PerspectiveCamera: MockClass,
  Color: MockClass,
  Clock: MockClock,
  AmbientLight: MockClass,
  DirectionalLight: MockClass,
  DirectionalLightHelper: MockClass,
  PlaneGeometry: MockClass,
  MeshBasicMaterial: MockClass,
  MeshLambertMaterial: MockClass,
  Mesh: MockClass,
  GridHelper: MockClass,
  Box3: MockBox3,
  Vector2: MockClass,
  Vector3: MockVector3,
  Sphere: MockClass,
  MathUtils: { degToRad: (deg) => deg * (Math.PI / 180) },
  AnimationMixer: MockClass,
  Object3D: MockObject3D,
  BoxGeometry: MockBoxGeometry,
};

module.exports = new Proxy(three, {
  get: function(target, prop, receiver) {
    if (prop in target) {
      return target[prop];
    }
    return MockClass;
  }
});
