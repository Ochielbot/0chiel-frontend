// Simple API test script
const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
    console.log('🧪 Testing Ochiel API...\n');
    
    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch('http://localhost:3001/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData.status);
        
        // Test thoughts endpoint
        console.log('\n2. Testing thoughts endpoint...');
        const thoughtsResponse = await fetch(`${API_BASE}/thoughts`);
        const thoughtsData = await thoughtsResponse.json();
        console.log(`✅ Found ${thoughtsData.length} thoughts`);
        thoughtsData.forEach(thought => {
            console.log(`   - ${thought.kind}: ${thought.label}`);
        });
        
        // Test currently endpoint
        console.log('\n3. Testing currently endpoint...');
        const currentlyResponse = await fetch(`${API_BASE}/currently`);
        const currentlyData = await currentlyResponse.json();
        console.log(`✅ Found ${currentlyData.length} currently items`);
        currentlyData.forEach(item => {
            console.log(`   - ${item.type}: ${item.title}`);
        });
        
        // Test settings endpoint
        console.log('\n4. Testing settings endpoint...');
        const settingsResponse = await fetch(`${API_BASE}/settings`);
        const settingsData = await settingsResponse.json();
        console.log(`✅ Found ${Object.keys(settingsData).length} settings`);
        Object.entries(settingsData).forEach(([key, value]) => {
            console.log(`   - ${key}: ${value}`);
        });
        
        // Test Spotify status
        console.log('\n5. Testing Spotify integration...');
        const spotifyResponse = await fetch(`${API_BASE}/spotify/status`);
        const spotifyData = await spotifyResponse.json();
        console.log('✅ Spotify status:', spotifyData.hasToken ? 'Connected' : 'Not connected');
        
        console.log('\n🎉 All API tests passed!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        console.log('\n💡 Make sure the backend server is running:');
        console.log('   cd backend && npm run dev');
    }
}

// Run tests
testAPI();