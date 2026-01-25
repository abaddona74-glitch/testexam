
async function testRateLimit() {
    console.log("Testing Rate Limit on /api/trial-key (Limit: 3 requests/hour)...");
    console.log("Make sure your Next.js server is running on http://localhost:3000\n");
    
    // We expect the 4th request (or sooner) to fail with 429
    for (let i = 1; i <= 5; i++) {
        try {
            const res = await fetch('http://localhost:3000/api/trial-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: `test-device-${Math.random()}` }) // Random ID to avoid logic blocks, hitting rate limit first
            });
            
            // Note: trial-key might return 400 or 200 depending on logic, but Rate Limit hits BEFORE that.
            // If Rate limited => 429.
            
            const statusMsg = res.status === 429 ? '🔴 BLOCKED (429)' : `🟢 Passed (${res.status})`;
            console.log(`Request ${i}: ${statusMsg}`);

            if(res.status === 429) {
                console.log("\n✅ SUCCESS: Rate Limiter is working correctly!");
                return; 
            }
        } catch (e) {
            console.error(`Request ${i} Failed: Is server running? Error: ${e.message}`);
            return;
        }
    }
    console.log("\n⚠️ WARNING: Rate limit was not triggered. Did you restart the server?");
}

testRateLimit();
