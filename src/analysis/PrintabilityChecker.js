import * as THREE from 'three';

/**
 * PrintabilityChecker
 * ---------------------------------------------------------------------------
 * Analyses a loaded 3D model and reports whether it is suitable for 3D
 * printing. It checks geometry validity, watertightness (manifoldness),
 * degenerate faces, overall dimensions and gives a rough material estimate.
 *
 * Notes / limitations:
 *  - Watertightness is detected by welding vertices by position and counting
 *    how many triangles share each edge (open edges => holes, >2 => non-manifold).
 *  - Wall-thickness analysis is not performed (it requires voxelisation / ray
 *    sampling); a manual reminder is surfaced instead.
 *  - Real-world size assumes 1 model unit == 1 millimetre, the glTF/OBJ
 *    convention most slicers expect.
 */
export class PrintabilityChecker {
    constructor(core) {
        this.core = core;
        // Typical desktop FDM constraints (mm) and PLA density (g/cm^3)
        this.maxBedSizeMm = 256;
        this.minFeatureMm = 2;
        this.plaDensity = 1.24;
    }

    /**
     * Run the full analysis on a model (THREE.Object3D).
     * @returns {object} report
     */
    analyzeModel(model) {
        const meshes = [];
        model.updateWorldMatrix(true, true);
        model.traverse((child) => {
            if (child.isMesh && child.geometry && child.geometry.attributes?.position) {
                meshes.push(child);
            }
        });

        const report = {
            meshCount: meshes.length,
            triangleCount: 0,
            boundaryEdgeCount: 0,
            nonManifoldEdgeCount: 0,
            degenerateFaceCount: 0,
            volumeMm3: 0,
            areaMm2: 0,
            dimensionsMm: { x: 0, y: 0, z: 0 },
            watertight: false,
            checks: []
        };

        if (meshes.length === 0) {
            report.checks.push({
                label: 'Geometry',
                status: 'fail',
                detail: 'No printable mesh geometry found in this model.'
            });
            return report;
        }

        // Overall bounding box (world space)
        const fullBox = new THREE.Box3().setFromObject(model);
        const size = fullBox.getSize(new THREE.Vector3());
        report.dimensionsMm = { x: size.x, y: size.y, z: size.z };
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const tol = maxDim * 1e-5;

        let signedVolume = 0;
        let area = 0;

        for (const mesh of meshes) {
            const geom = mesh.geometry;
            const pos = geom.attributes.position;
            const index = geom.index ? geom.index.array : null;
            const triCount = index ? index.length / 3 : pos.count / 3;
            report.triangleCount += triCount;

            // Weld vertices by quantised position to find shared edges
            const weldMap = new Map();
            const edgeUse = new Map();
            const matrixWorld = mesh.matrixWorld;

            const vA = new THREE.Vector3();
            const vB = new THREE.Vector3();
            const vC = new THREE.Vector3();
            const cross = new THREE.Vector3();
            const ab = new THREE.Vector3();
            const ac = new THREE.Vector3();

            const getVertex = (i, target) => {
                target.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
                return target;
            };

            const weldId = (v) => {
                const key = `${Math.round(v.x / tol)}_${Math.round(v.y / tol)}_${Math.round(v.z / tol)}`;
                let id = weldMap.get(key);
                if (id === undefined) {
                    id = weldMap.size;
                    weldMap.set(key, id);
                }
                return id;
            };

            const addEdge = (a, b) => {
                const lo = Math.min(a, b);
                const hi = Math.max(a, b);
                const key = lo * 0x100000000 + hi; // safe enough for typical meshes
                edgeUse.set(key, (edgeUse.get(key) || 0) + 1);
            };

            const idx = (k) => (index ? index[k] : k);

            for (let t = 0; t < triCount; t++) {
                const i0 = idx(t * 3);
                const i1 = idx(t * 3 + 1);
                const i2 = idx(t * 3 + 2);

                getVertex(i0, vA);
                getVertex(i1, vB);
                getVertex(i2, vC);

                // Signed volume (divergence theorem) and surface area
                signedVolume += vA.dot(cross.copy(vB).cross(vC)) / 6;
                ab.subVectors(vB, vA);
                ac.subVectors(vC, vA);
                area += 0.5 * cross.copy(ab).cross(ac).length();

                const a = weldId(vA);
                const b = weldId(vB);
                const c = weldId(vC);

                if (a === b || b === c || a === c) {
                    report.degenerateFaceCount++;
                    continue; // skip edges of a degenerate triangle
                }
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }

            for (const count of edgeUse.values()) {
                if (count === 1) report.boundaryEdgeCount++;
                else if (count > 2) report.nonManifoldEdgeCount++;
            }
        }

        report.volumeMm3 = Math.abs(signedVolume);
        report.areaMm2 = area;
        report.watertight = report.boundaryEdgeCount === 0 && report.nonManifoldEdgeCount === 0;

        this._buildChecks(report);
        return report;
    }

    _buildChecks(report) {
        const checks = report.checks;

        // 1. Geometry present
        checks.push({
            label: 'Geometry',
            status: report.triangleCount > 0 ? 'pass' : 'fail',
            detail: `${report.meshCount} mesh part(s), ${report.triangleCount.toLocaleString()} triangles.`
        });

        // 2. Watertight / manifold
        if (report.watertight) {
            checks.push({
                label: 'Watertight (manifold)',
                status: 'pass',
                detail: 'Closed surface with no holes — ready to slice.'
            });
        } else {
            if (report.boundaryEdgeCount > 0) {
                checks.push({
                    label: 'Watertight (manifold)',
                    status: 'fail',
                    detail: `${report.boundaryEdgeCount.toLocaleString()} open edge(s) detected — the mesh has holes and must be repaired (e.g. in Blender, Meshmixer or Microsoft 3D Builder) before printing.`
                });
            }
            if (report.nonManifoldEdgeCount > 0) {
                checks.push({
                    label: 'Manifold edges',
                    status: 'warn',
                    detail: `${report.nonManifoldEdgeCount.toLocaleString()} non-manifold edge(s) (shared by 3+ faces). Many slicers handle these, but repair is recommended.`
                });
            }
        }

        // 3. Degenerate faces
        checks.push({
            label: 'Degenerate faces',
            status: report.degenerateFaceCount === 0 ? 'pass' : 'warn',
            detail: report.degenerateFaceCount === 0
                ? 'No zero-area faces.'
                : `${report.degenerateFaceCount.toLocaleString()} zero-area face(s) found; clean up recommended.`
        });

        // 4. Build size (assume 1 unit = 1 mm)
        const d = report.dimensionsMm;
        const maxDim = Math.max(d.x, d.y, d.z);
        const dimsText = `${d.x.toFixed(1)} × ${d.y.toFixed(1)} × ${d.z.toFixed(1)} mm`;
        if (maxDim > this.maxBedSizeMm) {
            checks.push({
                label: 'Build size',
                status: 'warn',
                detail: `${dimsText}. Larger than a typical ${this.maxBedSizeMm} mm bed — you may need to scale down or split the model.`
            });
        } else if (maxDim < this.minFeatureMm) {
            checks.push({
                label: 'Build size',
                status: 'warn',
                detail: `${dimsText}. Very small — confirm the units; you may need to scale up.`
            });
        } else {
            checks.push({
                label: 'Build size',
                status: 'pass',
                detail: `${dimsText} (assuming 1 unit = 1 mm).`
            });
        }

        // 5. Wall thickness (manual reminder)
        checks.push({
            label: 'Wall thickness',
            status: 'info',
            detail: 'Automatic thickness analysis is not performed. Make sure walls are at least ~0.8 mm (2 perimeters) so they print reliably.'
        });

        // 6. Material estimate
        if (report.volumeMm3 > 0) {
            const volumeCm3 = report.volumeMm3 / 1000;
            // Rough solid-vs-typical-infill range (20% infill ≈ 0.3 of solid mass)
            const massSolid = volumeCm3 * this.plaDensity;
            const massInfill = massSolid * 0.35;
            checks.push({
                label: 'Material estimate (PLA)',
                status: 'info',
                detail: `Volume ≈ ${volumeCm3.toFixed(1)} cm³. Filament ≈ ${massInfill.toFixed(0)}–${massSolid.toFixed(0)} g (20% infill to solid).`
            });
        }
    }

    /**
     * Produce a small HTML summary for the results panel.
     */
    renderReportHTML(report) {
        const icon = (s) => ({
            pass: '✅', warn: '⚠️', fail: '❌', info: 'ℹ️'
        }[s] || 'ℹ️');

        const overall = report.checks.some(c => c.status === 'fail')
            ? { text: 'Not print-ready', color: '#ef4444' }
            : report.checks.some(c => c.status === 'warn')
                ? { text: 'Printable with caution', color: '#f59e0b' }
                : { text: 'Ready to print', color: '#22c55e' };

        const rows = report.checks.map(c =>
            `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
                <span>${icon(c.status)}</span>
                <span><strong>${c.label}:</strong> ${c.detail}</span>
            </div>`
        ).join('');

        return `
            <div style="font-weight:700;color:${overall.color};margin-bottom:8px;">${overall.text}</div>
            ${rows}
        `;
    }
}
