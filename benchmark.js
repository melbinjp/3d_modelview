const { JSDOM } = require("jsdom");

const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.window = dom.window;

class MockAudioContext {
    constructor() {
        // simulate some cost
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
            sum += Math.sqrt(i);
        }
    }
}
global.window.AudioContext = MockAudioContext;

function playAmbientDroneBad() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // do nothing
}

let sharedContext = null;
function getAudioContext() {
    if (!sharedContext) {
        sharedContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedContext;
}

function playAmbientDroneGood() {
    const audioContext = getAudioContext();
    // do nothing
}

const ITERATIONS = 10000;

console.log("Measuring Baseline (Repeated Context Creation)...");
const startBad = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    playAmbientDroneBad();
}
const endBad = performance.now();
console.log(`Baseline time: ${(endBad - startBad).toFixed(2)} ms`);

console.log("Measuring Optimized (Singleton Context)...");
const startGood = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    playAmbientDroneGood();
}
const endGood = performance.now();
console.log(`Optimized time: ${(endGood - startGood).toFixed(2)} ms`);
