import * as THREE from 'three';

/**
 * GeometryTools - Utility class for geometry manipulation
 */
class GeometryTools {
    constructor() {
        this.modifiers = new Map();
        this.initializeModifiers();
    }

    initializeModifiers() {
        // Subdivision modifier
        this.modifiers.set('subdivide', (geometry, iterations = 1) => {
            // Simple subdivision by adding midpoints
            for (let i = 0; i < iterations; i++) {
                geometry = this.subdivideGeometry(geometry);
            }
            return geometry;
        });

        // Noise modifier
        this.modifiers.set('noise', (geometry, amplitude = 0.1, frequency = 1) => {
            const positions = geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                const noise = (Math.random() - 0.5) * amplitude;
                positions[i] += noise;
                positions[i + 1] += noise;
                positions[i + 2] += noise;
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
            return geometry;
        });

        // Twist modifier
        this.modifiers.set('twist', (geometry, angle = Math.PI) => {
            const positions = geometry.attributes.position.array;
            const bbox = geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
            const height = bbox.max.y - bbox.min.y;
            
            for (let i = 0; i < positions.length; i += 3) {
                const y = positions[i + 1];
                const factor = (y - bbox.min.y) / height;
                const twistAngle = angle * factor;
                
                const x = positions[i];
                const z = positions[i + 2];
                
                positions[i] = x * Math.cos(twistAngle) - z * Math.sin(twistAngle);
                positions[i + 2] = x * Math.sin(twistAngle) + z * Math.cos(twistAngle);
            }
            
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
            return geometry;
        });
    }

    subdivideGeometry(geometry) {
        // Simple midpoint subdivision
        const positions = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;
        
        if (!indices) {
            // Non-indexed geometry - simple approach
            return geometry;
        }

        const newPositions = [];
        const newIndices = [];
        
        // Add original vertices
        for (let i = 0; i < positions.length; i++) {
            newPositions.push(positions[i]);
        }
        
        let vertexCount = positions.length / 3;
        
        // Process each triangle
        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i];
            const b = indices[i + 1];
            const c = indices[i + 2];
            
            // Calculate midpoints
            const midAB = vertexCount++;
            const midBC = vertexCount++;
            const midCA = vertexCount++;
            
            // Add midpoint vertices
            newPositions.push(
                (positions[a * 3] + positions[b * 3]) / 2,
                (positions[a * 3 + 1] + positions[b * 3 + 1]) / 2,
                (positions[a * 3 + 2] + positions[b * 3 + 2]) / 2
            );
            
            newPositions.push(
                (positions[b * 3] + positions[c * 3]) / 2,
                (positions[b * 3 + 1] + positions[c * 3 + 1]) / 2,
                (positions[b * 3 + 2] + positions[c * 3 + 2]) / 2
            );
            
            newPositions.push(
                (positions[c * 3] + positions[a * 3]) / 2,
                (positions[c * 3 + 1] + positions[a * 3 + 1]) / 2,
                (positions[c * 3 + 2] + positions[a * 3 + 2]) / 2
            );
            
            // Create 4 new triangles
            newIndices.push(a, midAB, midCA);
            newIndices.push(midAB, b, midBC);
            newIndices.push(midCA, midBC, c);
            newIndices.push(midAB, midBC, midCA);
        }
        
        const newGeometry = new THREE.BufferGeometry();
        newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        newGeometry.setIndex(newIndices);
        newGeometry.computeVertexNormals();
        
        return newGeometry;
    }

    applyModifier(geometry, modifierName, ...args) {
        const modifier = this.modifiers.get(modifierName);
        if (modifier) {
            return modifier(geometry, ...args);
        }
        console.warn(`Modifier '${modifierName}' not found`);
        return geometry;
    }

    createCustomGeometry(type, parameters = {}) {
        switch (type) {
            case 'parametric':
                return this.createParametricGeometry(parameters);
            case 'fractal':
                return this.createFractalGeometry(parameters);
            case 'lsystem':
                return this.createLSystemGeometry(parameters);
            default:
                console.warn(`Custom geometry type '${type}' not supported`);
                return new THREE.BoxGeometry();
        }
    }

    createParametricGeometry(params) {
        const { func, slices = 32, stacks = 32 } = params;
        
        // Create parametric geometry manually since THREE.ParametricGeometry is deprecated
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const sliceCount = slices + 1;
        const stackCount = stacks + 1;

        for (let i = 0; i <= stacks; i++) {
            const v = i / stacks;
            for (let j = 0; j <= slices; j++) {
                const u = j / slices;
                const p = new THREE.Vector3();
                func(u, v, p);
                
                vertices.push(p.x, p.y, p.z);
                uvs.push(u, v);
                
                // Calculate normal (simplified)
                const normal = new THREE.Vector3(0, 0, 1);
                normals.push(normal.x, normal.y, normal.z);
            }
        }

        // Generate indices
        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < slices; j++) {
                const a = i * sliceCount + j;
                const b = i * sliceCount + j + 1;
                const c = (i + 1) * sliceCount + j + 1;
                const d = (i + 1) * sliceCount + j;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        geometry.computeVertexNormals();
        return geometry;
    }

    createFractalGeometry(params) {
        const { iterations = 3, scale = 0.5 } = params;
        // Simple fractal cube generation
        const geometry = new THREE.BoxGeometry();
        
        for (let i = 0; i < iterations; i++) {
            const scaleFactor = Math.pow(scale, i + 1);
            // Add smaller cubes at corners (simplified)
            // This is a basic example - real fractal geometry would be more complex
        }
        
        return geometry;
    }

    createLSystemGeometry(params) {
        const { axiom = 'F', rules = { 'F': 'F+F-F-F+F' }, iterations = 3 } = params;
        
        // Generate L-System string
        let current = axiom;
        for (let i = 0; i < iterations; i++) {
            let next = '';
            for (const char of current) {
                next += rules[char] || char;
            }
            current = next;
        }
        
        // Convert to geometry (simplified turtle graphics)
        const positions = [];
        let x = 0, y = 0, angle = 0;
        const step = 1;
        const angleStep = Math.PI / 2;
        
        for (const char of current) {
            switch (char) {
                case 'F':
                    const newX = x + Math.cos(angle) * step;
                    const newY = y + Math.sin(angle) * step;
                    positions.push(x, y, 0, newX, newY, 0);
                    x = newX;
                    y = newY;
                    break;
                case '+':
                    angle += angleStep;
                    break;
                case '-':
                    angle -= angleStep;
                    break;
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        return geometry;
    }
}

/**
 * ShaderManager - Manages custom shaders and geometry manipulation tools
 */
export class ShaderManager {
    constructor(core) {
        this.core = core;
        this.shaders = new Map();
        this.materials = new Map();
        this.geometryTools = new GeometryTools();
        this.computeShaders = new Map();
        
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize the shader manager
     */
    init() {
        if (this.initialized) return;

        try {
            this.initializeBuiltInShaders();
            this.initializeComputeShaders();
            this.initialized = true;
            this.core.emit('shader:initialized');
        } catch (error) {
            console.error('Failed to initialize ShaderManager:', error);
            throw error;
        }
    }

    /**
     * Initialize built-in shaders
     */
    initializeBuiltInShaders() {
        // Vertex displacement shader
        this.registerShader('vertexDisplacement', {
            vertexShader: `
                uniform float time;
                uniform float amplitude;
                uniform float frequency;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Apply displacement
                    float displacement = sin(pos.x * frequency + time) * 
                                       sin(pos.y * frequency + time) * 
                                       sin(pos.z * frequency + time) * amplitude;
                    
                    pos += normal * displacement;
                    vPosition = pos;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float opacity;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                    float intensity = dot(vNormal, light);
                    
                    gl_FragColor = vec4(color * intensity, opacity);
                }
            `,
            uniforms: {
                time: { value: 0.0 },
                amplitude: { value: 0.1 },
                frequency: { value: 1.0 },
                color: { value: new THREE.Color(0x00ff00) },
                opacity: { value: 1.0 }
            }
        });

        // Holographic shader
        this.registerShader('holographic', {
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    vUv = uv;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float fresnelPower;
                uniform float scanlineFreq;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vec3 viewDirection = normalize(-vPosition);
                    float fresnel = pow(1.0 - dot(viewDirection, vNormal), fresnelPower);
                    
                    float scanline = sin(vUv.y * scanlineFreq + time * 2.0) * 0.5 + 0.5;
                    
                    vec3 color = mix(color1, color2, fresnel);
                    color *= scanline;
                    
                    gl_FragColor = vec4(color, fresnel * 0.8);
                }
            `,
            uniforms: {
                time: { value: 0.0 },
                color1: { value: new THREE.Color(0x00ffff) },
                color2: { value: new THREE.Color(0xff00ff) },
                fresnelPower: { value: 2.0 },
                scanlineFreq: { value: 20.0 }
            }
        });

        // Toon shader
        this.registerShader('toon', {
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform int levels;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                    float intensity = dot(vNormal, light);
                    
                    // Quantize the intensity
                    intensity = floor(intensity * float(levels)) / float(levels);
                    
                    gl_FragColor = vec4(color * intensity, 1.0);
                }
            `,
            uniforms: {
                color: { value: new THREE.Color(0xffffff) },
                levels: { value: 4 }
            }
        });

        // Water shader
        this.registerShader('water', {
            vertexShader: `
                uniform float time;
                uniform float waveHeight;
                uniform float waveFrequency;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    
                    vec3 pos = position;
                    
                    // Create waves
                    float wave1 = sin(pos.x * waveFrequency + time) * waveHeight;
                    float wave2 = sin(pos.z * waveFrequency * 0.7 + time * 1.3) * waveHeight * 0.5;
                    
                    pos.y += wave1 + wave2;
                    
                    vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
                    
                    // Calculate normal for waves
                    float dx = cos(pos.x * waveFrequency + time) * waveFrequency * waveHeight;
                    float dz = cos(pos.z * waveFrequency * 0.7 + time * 1.3) * waveFrequency * 0.7 * waveHeight * 0.5;
                    
                    vec3 norm = normalize(vec3(-dx, 1.0, -dz));
                    vNormal = normalize(normalMatrix * norm);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 waterColor;
                uniform float transparency;
                uniform float fresnelPower;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                
                void main() {
                    vec3 viewDirection = normalize(-vPosition);
                    float fresnel = pow(1.0 - dot(viewDirection, vNormal), fresnelPower);
                    
                    // Add some foam effect
                    float foam = sin(vUv.x * 10.0 + time) * sin(vUv.y * 10.0 + time * 1.2);
                    foam = smoothstep(0.7, 1.0, foam);
                    
                    vec3 color = mix(waterColor, vec3(1.0), foam * 0.3);
                    float alpha = mix(transparency, 1.0, fresnel);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            uniforms: {
                time: { value: 0.0 },
                waveHeight: { value: 0.1 },
                waveFrequency: { value: 2.0 },
                waterColor: { value: new THREE.Color(0x006994) },
                transparency: { value: 0.7 },
                fresnelPower: { value: 2.0 }
            }
        });

        // Dissolve shader
        this.registerShader('dissolve', {
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float dissolveAmount;
                uniform vec3 dissolveColor;
                uniform vec3 baseColor;
                uniform sampler2D noiseTexture;
                uniform float edgeWidth;
                
                varying vec2 vUv;
                varying vec3 vNormal;
                
                void main() {
                    float noise = texture2D(noiseTexture, vUv).r;
                    
                    if (noise < dissolveAmount) {
                        discard;
                    }
                    
                    float edge = smoothstep(dissolveAmount, dissolveAmount + edgeWidth, noise);
                    vec3 color = mix(dissolveColor, baseColor, edge);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            uniforms: {
                dissolveAmount: { value: 0.0 },
                dissolveColor: { value: new THREE.Color(0xff4400) },
                baseColor: { value: new THREE.Color(0xffffff) },
                noiseTexture: { value: null },
                edgeWidth: { value: 0.1 }
            }
        });
    }

    /**
     * Initialize compute shaders
     */
    initializeComputeShaders() {
        // Particle system compute shader
        this.registerComputeShader('particles', {
            computeShader: `
                #version 300 es
                precision highp float;
                
                layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;
                
                layout(std430, binding = 0) restrict buffer PositionBuffer {
                    vec4 positions[];
                };
                
                layout(std430, binding = 1) restrict buffer VelocityBuffer {
                    vec4 velocities[];
                };
                
                uniform float deltaTime;
                uniform vec3 gravity;
                uniform float damping;
                
                void main() {
                    uint index = gl_GlobalInvocationID.x;
                    
                    if (index >= positions.length()) return;
                    
                    vec3 pos = positions[index].xyz;
                    vec3 vel = velocities[index].xyz;
                    
                    // Apply gravity
                    vel += gravity * deltaTime;
                    
                    // Apply damping
                    vel *= damping;
                    
                    // Update position
                    pos += vel * deltaTime;
                    
                    // Simple boundary check
                    if (pos.y < 0.0) {
                        pos.y = 0.0;
                        vel.y = -vel.y * 0.8;
                    }
                    
                    positions[index] = vec4(pos, 1.0);
                    velocities[index] = vec4(vel, 0.0);
                }
            `,
            uniforms: {
                deltaTime: { value: 0.016 },
                gravity: { value: new THREE.Vector3(0, -9.81, 0) },
                damping: { value: 0.99 }
            }
        });

        // Fluid simulation compute shader
        this.registerComputeShader('fluid', {
            computeShader: `
                #version 300 es
                precision highp float;
                
                layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
                
                layout(r32f, binding = 0) uniform image2D velocityX;
                layout(r32f, binding = 1) uniform image2D velocityY;
                layout(r32f, binding = 2) uniform image2D pressure;
                layout(r32f, binding = 3) uniform image2D density;
                
                uniform float deltaTime;
                uniform float viscosity;
                uniform float diffusion;
                
                void main() {
                    ivec2 coord = ivec2(gl_GlobalInvocationID.xy);
                    ivec2 size = imageSize(velocityX);
                    
                    if (coord.x >= size.x || coord.y >= size.y) return;
                    
                    // Simple fluid simulation step
                    float vx = imageLoad(velocityX, coord).r;
                    float vy = imageLoad(velocityY, coord).r;
                    float p = imageLoad(pressure, coord).r;
                    float d = imageLoad(density, coord).r;
                    
                    // Apply viscosity and diffusion (simplified)
                    vx *= (1.0 - viscosity * deltaTime);
                    vy *= (1.0 - viscosity * deltaTime);
                    d *= (1.0 - diffusion * deltaTime);
                    
                    imageStore(velocityX, coord, vec4(vx));
                    imageStore(velocityY, coord, vec4(vy));
                    imageStore(density, coord, vec4(d));
                }
            `,
            uniforms: {
                deltaTime: { value: 0.016 },
                viscosity: { value: 0.01 },
                diffusion: { value: 0.001 }
            }
        });
    }

    /**
     * Register a custom shader
     */
    registerShader(name, shaderData) {
        this.shaders.set(name, shaderData);
        this.core.emit('shader:registered', { name, shaderData });
    }

    /**
     * Register a compute shader
     */
    registerComputeShader(name, computeShaderData) {
        this.computeShaders.set(name, computeShaderData);
        this.core.emit('compute-shader:registered', { name, computeShaderData });
    }

    /**
     * Create a material from a shader
     */
    createMaterial(shaderName, customUniforms = {}) {
        const shaderData = this.shaders.get(shaderName);
        if (!shaderData) {
            console.warn(`Shader '${shaderName}' not found`);
            return new THREE.MeshBasicMaterial();
        }

        const uniforms = THREE.UniformsUtils.merge([
            shaderData.uniforms || {},
            customUniforms
        ]);

        const material = new THREE.ShaderMaterial({
            vertexShader: shaderData.vertexShader,
            fragmentShader: shaderData.fragmentShader,
            uniforms: uniforms,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.materials.set(`${shaderName}_${Date.now()}`, material);
        return material;
    }

    /**
     * Update shader uniforms
     */
    updateUniforms(material, uniforms) {
        if (material.uniforms) {
            Object.keys(uniforms).forEach(key => {
                if (material.uniforms[key]) {
                    material.uniforms[key].value = uniforms[key];
                }
            });
        }
    }

    /**
     * Create compute shader renderer
     */
    createComputeRenderer(shaderName, buffers) {
        const computeShaderData = this.computeShaders.get(shaderName);
        if (!computeShaderData) {
            console.warn(`Compute shader '${shaderName}' not found`);
            return null;
        }

        // This would require WebGL 2.0 compute shader support
        // For now, return a mock object
        return {
            compute: (renderer) => {
                console.log(`Computing with shader: ${shaderName}`);
            },
            dispose: () => {
                console.log(`Disposing compute shader: ${shaderName}`);
            }
        };
    }

    /**
     * Apply geometry modifier
     */
    applyGeometryModifier(geometry, modifierName, ...args) {
        return this.geometryTools.applyModifier(geometry, modifierName, ...args);
    }

    /**
     * Create custom geometry
     */
    createCustomGeometry(type, parameters) {
        return this.geometryTools.createCustomGeometry(type, parameters);
    }

    /**
     * Get available shaders
     */
    getAvailableShaders() {
        return Array.from(this.shaders.keys());
    }

    /**
     * Get available compute shaders
     */
    getAvailableComputeShaders() {
        return Array.from(this.computeShaders.keys());
    }

    /**
     * Get shader data
     */
    getShader(name) {
        return this.shaders.get(name);
    }

    /**
     * Get compute shader data
     */
    getComputeShader(name) {
        return this.computeShaders.get(name);
    }

    /**
     * Update time-based uniforms
     */
    updateTime(time) {
        this.materials.forEach(material => {
            if (material.uniforms && material.uniforms.time) {
                material.uniforms.time.value = time;
            }
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.materials.forEach(material => {
            material.dispose();
        });
        
        this.shaders.clear();
        this.materials.clear();
        this.computeShaders.clear();
        this.initialized = false;
        
        this.core.emit('shader:destroyed');
    }
}