import { Viewer } from './viewer.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const viewer = new Viewer('viewerContainer');
    const ui = new UI(viewer);

    viewer.loadDefaultModel();
});
