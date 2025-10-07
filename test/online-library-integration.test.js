/**
 * Test suite for Online Library Integration
 */

import { OnlineLibraryManager } from '../src/assets/OnlineLibraryManager.js';

describe('OnlineLibraryManager', () => {
    let manager;
    let mockAssetManager;

    beforeEach(() => {
        // Mock AssetManager
        mockAssetManager = {
            loadModelFromFile: jest.fn().mockResolvedValue({ model: {}, animations: [] })
        };
        
        manager = new OnlineLibraryManager(mockAssetManager);
    });

    afterEach(() => {
        if (manager) {
            manager.destroy();
        }
    });

    describe('Library Setup', () => {
        test('should initialize with supported libraries', () => {
            const libraries = manager.getAvailableLibraries();
            
            expect(libraries).toHaveLength(4);
            expect(libraries.map(lib => lib.id)).toContain('sketchfab');
            expect(libraries.map(lib => lib.id)).toContain('polyhaven');
            expect(libraries.map(lib => lib.id)).toContain('threejs-examples');
            expect(libraries.map(lib => lib.id)).toContain('gltf-samples');
        });

        test('should have correct library configurations', () => {
            const sketchfab = manager.getLibraryInfo('sketchfab');
            const polyhaven = manager.getLibraryInfo('polyhaven');
            
            expect(sketchfab.requiresAuth).toBe(true);
            expect(polyhaven.requiresAuth).toBe(false);
            expect(sketchfab.supportedFormats).toContain('gltf');
            expect(polyhaven.supportedFormats).toContain('hdr');
        });
    });

    describe('Asset Search', () => {
        test('should search Three.js examples', async () => {
            const results = await manager.searchAssets('', 'threejs-examples');
            
            expect(results).toHaveLength(4);
            expect(results[0]).toHaveProperty('id');
            expect(results[0]).toHaveProperty('name');
            expect(results[0]).toHaveProperty('downloadUrl');
            expect(results[0]).toHaveProperty('format');
            expect(results[0].library).toBe('threejs-examples');
        });

        test('should search glTF samples', async () => {
            const results = await manager.searchAssets('', 'gltf-samples');
            
            expect(results).toHaveLength(4);
            expect(results[0]).toHaveProperty('id');
            expect(results[0]).toHaveProperty('name');
            expect(results[0]).toHaveProperty('downloadUrl');
            expect(results[0].format).toMatch(/glb|gltf/);
            expect(results[0].library).toBe('gltf-samples');
        });

        test('should handle search across all libraries', async () => {
            const results = await manager.searchAssets('duck');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(r => r.library === 'threejs-examples' || r.library === 'gltf-samples')).toBe(true);
        });

        test('should add search to history', async () => {
            await manager.searchAssets('test query');
            
            expect(manager.searchHistory).toContain('test query');
        });

        test('should limit search history to 10 items', async () => {
            // Add 15 search terms
            for (let i = 0; i < 15; i++) {
                await manager.searchAssets(`query ${i}`);
            }
            
            expect(manager.searchHistory).toHaveLength(10);
            expect(manager.searchHistory[0]).toBe('query 14'); // Most recent first
        });
    });

    describe('Favorites Management', () => {
        test('should add asset to favorites', () => {
            const asset = { id: 'test', library: 'test-lib', name: 'Test Asset' };
            
            manager.addToFavorites(asset);
            
            expect(manager.favorites.has('test-lib_test')).toBe(true);
        });

        test('should remove asset from favorites', () => {
            const asset = { id: 'test', library: 'test-lib', name: 'Test Asset' };
            
            manager.addToFavorites(asset);
            manager.removeFromFavorites(asset);
            
            expect(manager.favorites.has('test-lib_test')).toBe(false);
        });

        test('should get favorites list', () => {
            const asset = { id: 'test', library: 'test-lib', name: 'Test Asset' };
            
            // Add to offline assets first (favorites only shows offline assets)
            manager.offlineAssets.set('test-lib_test', asset);
            manager.addToFavorites(asset);
            
            const favorites = manager.getFavorites();
            
            expect(favorites).toHaveLength(1);
            expect(favorites[0].isFavorite).toBe(true);
        });
    });

    describe('Search Suggestions', () => {
        test('should provide search suggestions', () => {
            manager.searchHistory = ['character model', 'vehicle design'];
            
            const suggestions = manager.getSearchSuggestions('char');
            
            expect(suggestions).toHaveLength(2); // 1 from history + 1 from popular tags
            expect(suggestions.some(s => s.type === 'history')).toBe(true);
            expect(suggestions.some(s => s.type === 'tag')).toBe(true);
        });

        test('should limit suggestions to 5 items', () => {
            manager.searchHistory = ['char1', 'char2', 'char3', 'char4', 'char5', 'char6'];
            
            const suggestions = manager.getSearchSuggestions('char');
            
            expect(suggestions.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Cache Management', () => {
        test('should provide cache statistics', () => {
            const stats = manager.getCacheStats();
            
            expect(stats).toHaveProperty('cachedAssets');
            expect(stats).toHaveProperty('offlineAssets');
            expect(stats).toHaveProperty('libraries');
            expect(stats).toHaveProperty('favorites');
            expect(stats).toHaveProperty('searchHistory');
        });

        test('should clear memory cache', () => {
            manager.cache.set('test', 'data');
            
            manager.clearCache();
            
            expect(manager.cache.size).toBe(0);
        });
    });

    describe('Library Configuration', () => {
        test('should configure library settings', () => {
            const config = { apiKey: 'test-key' };
            
            manager.configureLibrary('sketchfab', config);
            
            const library = manager.getLibraryInfo('sketchfab');
            expect(library.apiKey).toBe('test-key');
        });
    });

    describe('Asset Preview', () => {
        test('should return thumbnail if available', async () => {
            const asset = { thumbnail: 'http://example.com/thumb.jpg' };
            
            const preview = await manager.getAssetPreview(asset);
            
            expect(preview).toBe('http://example.com/thumb.jpg');
        });

        test('should generate preview for offline assets', async () => {
            const asset = { name: 'Test Asset', isOfflineAvailable: true };
            
            const preview = await manager.getAssetPreview(asset);
            
            expect(preview).toContain('data:image/svg+xml');
            expect(preview).toContain('Test Asset');
        });

        test('should return null for assets without preview', async () => {
            const asset = { name: 'Test Asset' };
            
            const preview = await manager.getAssetPreview(asset);
            
            expect(preview).toBeNull();
        });
    });

    describe('Offline Support', () => {
        test('should search offline assets when offline', () => {
            // Mock offline assets
            manager.offlineAssets.set('test_1', {
                id: 'test_1',
                name: 'Test Model',
                description: 'A test model',
                tags: ['test', 'model'],
                library: 'test'
            });

            const results = manager.searchOfflineAssets('test');
            
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Test Model');
            expect(results[0].isOfflineAvailable).toBe(true);
        });

        test('should filter offline search by library', () => {
            manager.offlineAssets.set('lib1_1', { name: 'Model 1', library: 'lib1' });
            manager.offlineAssets.set('lib2_1', { name: 'Model 2', library: 'lib2' });

            const results = manager.searchOfflineAssets('model', 'lib1');
            
            expect(results).toHaveLength(1);
            expect(results[0].library).toBe('lib1');
        });

        test('should search by name, tags, and description', () => {
            manager.offlineAssets.set('test_1', {
                name: 'Car Model',
                description: 'Sports vehicle',
                tags: ['automotive', 'transport'],
                library: 'test'
            });

            const nameResults = manager.searchOfflineAssets('car');
            const descResults = manager.searchOfflineAssets('vehicle');
            const tagResults = manager.searchOfflineAssets('automotive');
            
            expect(nameResults).toHaveLength(1);
            expect(descResults).toHaveLength(1);
            expect(tagResults).toHaveLength(1);
        });
    });
});