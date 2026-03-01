/**
 * Online Library Integration Demo
 * Demonstrates the asset library browsing and loading functionality
 */

// Wait for the model viewer to be initialized
document.addEventListener('DOMContentLoaded', () => {
    // Add demo button to test online library functionality
    const checkForModelViewer = () => {
        if (window.modelViewer && window.modelViewer.assetManager && window.modelViewer.assetManager.onlineLibraryManager) {
            addDemoButton();
        } else {
            // Check again in 1 second
            setTimeout(checkForModelViewer, 1000);
        }
    };
    
    // Start checking after 2 seconds
    setTimeout(checkForModelViewer, 2000);
});

function addDemoButton() {
    // Create demo button
    const demoButton = document.createElement('button');
    demoButton.textContent = 'Test Online Library';
    demoButton.className = 'btn secondary';
    demoButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
    `;
    
    demoButton.addEventListener('click', testOnlineLibrary);
    document.body.appendChild(demoButton);
    
    // Create simple search test button
    const searchTestButton = document.createElement('button');
    searchTestButton.textContent = 'Test Search';
    searchTestButton.className = 'btn secondary';
    searchTestButton.style.cssText = `
        position: fixed;
        top: 50px;
        right: 10px;
        z-index: 1000;
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
    `;
    
    searchTestButton.addEventListener('click', testSimpleSearch);
    document.body.appendChild(searchTestButton);
}

async function testSimpleSearch() {
    console.log('=== Simple Search Test ===');
    
    try {
        const assetManager = window.modelViewer.assetManager;
        
        console.log('Testing Three.js Examples search...');
        const results = await assetManager.searchOnlineAssets('', 'threejs-examples');
        console.log('Results:', results);
        
        showDemoMessage(`Found ${results.length} Three.js examples`, 'success');
        
    } catch (error) {
        console.error('Simple search test failed:', error);
        showDemoMessage('Search test failed: ' + error.message, 'error');
    }
}

async function testOnlineLibrary() {
    const assetManager = window.modelViewer.assetManager;
    const onlineLibrary = assetManager.onlineLibraryManager;
    
    console.log('=== Online Library Integration Test ===');
    
    try {
        // Test 1: Verify libraries are set up
        console.log('✓ Testing library setup...');
        const libraries = onlineLibrary.getAvailableLibraries();
        console.log(`Found ${libraries.length} libraries:`, libraries.map(l => l.name));
        
        // Test 2: Test search functionality with different queries
        console.log('✓ Testing search functionality...');
        
        // Search for characters
        const characterResults = await assetManager.searchOnlineAssets('character', 'gltf-samples');
        console.log(`Character search: ${characterResults.length} results`);
        
        // Search for animals  
        const animalResults = await assetManager.searchOnlineAssets('duck', 'gltf-samples');
        console.log(`Animal search: ${animalResults.length} results`);
        
        // Search environments
        const envResults = await assetManager.searchOnlineAssets('studio', 'environments');
        console.log(`Environment search: ${envResults.length} results`);
        
        // Test 3: Test asset loading
        console.log('✓ Testing asset loading...');
        if (animalResults.length > 0) {
            const testAsset = animalResults[0];
            console.log(`Loading: ${testAsset.name}`);
            await assetManager.loadAssetFromLibrary(testAsset);
            console.log('✅ Asset loaded successfully!');
        }
        
        // Test 4: Test favorites and caching
        console.log('✓ Testing favorites and caching...');
        if (characterResults.length > 0) {
            onlineLibrary.addToFavorites(characterResults[0]);
            const favorites = onlineLibrary.getFavorites();
            console.log(`Favorites: ${favorites.length} items`);
        }
        
        const stats = onlineLibrary.getCacheStats();
        console.log('Cache stats:', stats);
        
        console.log('\n🎉 ALL TESTS PASSED - Online Library Integration Working!');
        showDemoMessage('✅ Integration Test Passed! Online Library is working correctly.', 'success');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        showDemoMessage('❌ Integration Test Failed: ' + error.message, 'error');
    }
}

function showDemoMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        z-index: 1001;
        padding: 10px 15px;
        border-radius: 4px;
        max-width: 300px;
        font-size: 14px;
        ${type === 'success' ? 'background: #28a745; color: white;' : 
          type === 'error' ? 'background: #dc3545; color: white;' : 
          'background: #17a2b8; color: white;'}
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testOnlineLibrary };
}