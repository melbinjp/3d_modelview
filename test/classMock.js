// test/classMock.js

const MockClass = class {
  constructor(manager) {}

  load(url, onLoad, onProgress, onError) {
    if (onLoad) {
      onLoad({ scene: {} });
    }
  }

  parse(scene, onCompleted, onError, options) {
      if(onCompleted) {
          onCompleted({}); // return some dummy data
      }
  }

  setPath() {
    return this;
  }

  setTranscoderPath() {
    return this;
  }
};

// Use a Proxy to dynamically handle any named export request (e.g., GLTFLoader, FBXLoader)
module.exports = new Proxy({}, {
  get: function(target, prop, receiver) {
    return MockClass;
  }
});
