export class UI {
    constructor(viewer) {
        this.viewer = viewer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Example: Moving the URL loader listener
        document.getElementById('loadUrlBtn').addEventListener('click', () => {
            const url = document.getElementById('modelUrl').value.trim();
            if (url) {
                this.viewer.loadModelFromUrl(url);
            }
        });

        document.getElementById('modelUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value.trim();
                if (url) {
                    this.viewer.loadModelFromUrl(url);
                }
            }
        });

        // Other listeners like for background, lighting, etc. would be moved here
        // For example:
        document.getElementById('resetCamera').addEventListener('click', () => {
            // This would call a method on the viewer instance
            // this.viewer.resetCamera();
        });
    }
}
