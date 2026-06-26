#!/usr/bin/env node

/**
 * Invite Flow Integration Test
 * =============================
 * Simulates the full invite flow via HTTP API calls:
 * 1. Generate invite code for inviter
 * 2. Get initial stars for both users
 * 3. Register invitee using invite code
 * 4. Verify both users received +50 bonus stars
 * 5. Test edge cases (duplicate registration, same-name, etc.)
 *
 * Usage:
 *   node scripts/test-invite-flow.mjs
 *
 * Requires the Next.js dev server running at BASE_URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Unique test names to avoid collisions with real users
const TS = Date.now();
const INVITER_NAME = `TestInviter_${TS}`;
const INVITEE_NAME = `TestInvitee_${TS}`;

let passed = 0;
let failed = 0;
const failures = [];

function ok(description, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${description}`);
  } else {
    failed++;
    const msg = `  ❌ ${description}`;
    console.log(msg);
    failures.push(msg);
  }
}

function fail(description, error) {
  failed++;
  const msg = `  ❌ ${description}: ${error}`;
  console.log(msg);
  failures.push(msg);
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function getStars(name) {
  const res = await api(`/api/stars?name=${encodeURIComponent(name)}`);
  if (res.success) return res.stars;
  throw new Error(`Failed to get stars for ${name}: ${res.message}`);
}

// ─── MAIN TEST ───────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n🧪 Invite Flow Integration Test`);
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   Inviter: ${INVITER_NAME}`);
  console.log(`   Invitee: ${INVITEE_NAME}\n`);

  try {
    // ═══════════════════════════════════════════════════════════════════════
    console.log('▶  Test 1: Generate invite code');
    // ═══════════════════════════════════════════════════════════════════════
    const genRes = await api('/api/invite/generate', {
      method: 'POST',
      body: JSON.stringify({ name: INVITER_NAME }),
    });

    ok('generate returns success', genRes.success === true);
    ok('inviteCode is 8 characters', typeof genRes.inviteCode === 'string' && genRes.inviteCode.length === 8);
    ok('inviteUrl contains invite code', genRes.inviteUrl && genRes.inviteUrl.includes(genRes.inviteCode));
    const inviteCode = genRes.inviteCode;
    console.log(`     Code: ${inviteCode}`);

    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n▶  Test 2: Get initial stars for both users');
    // ═══════════════════════════════════════════════════════════════════════
    const inviterStarsBefore = await getStars(INVITER_NAME);
    ok(`inviter initial stars = 100 (got ${inviterStarsBefore})`, inviterStarsBefore === 100);

    // Invitee doesn't exist yet – first GET creates them with 100
    const inviteeStarsBefore = await getStars(INVITEE_NAME);
    ok(`invitee initial stars = 100 (got ${inviteeStarsBefore})`, inviteeStarsBefore === 100);

    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n▶  Test 3: Register invitee via invite code');
    // ═══════════════════════════════════════════════════════════════════════
    const regRes = await api('/api/invite/register', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, name: INVITEE_NAME }),
    });

    ok('register returns success', regRes.success === true);
    ok('message mentions both names', regRes.message && regRes.message.includes(INVITEE_NAME) && regRes.message.includes(INVITER_NAME));
    ok('message mentions +50 stars', regRes.message && regRes.message.includes('50'));
    ok('bonusStars is 50', regRes.bonusStars === 50);

    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n▶  Test 4: Verify both users received +50 stars');
    // ═══════════════════════════════════════════════════════════════════════
    const inviterStarsAfter = await getStars(INVITER_NAME);
    const inviteeStarsAfter = await getStars(INVITEE_NAME);

    ok(`inviter stars: ${inviterStarsBefore} → ${inviterStarsAfter} (+50)`, inviterStarsAfter === inviterStarsBefore + 50);
    ok(`invitee stars: ${inviteeStarsBefore} → ${inviteeStarsAfter} (+50)`, inviteeStarsAfter === inviteeStarsBefore + 50);
    ok('inviter now has 150 stars', inviterStarsAfter === 150);
    ok('invitee now has 150 stars', inviteeStarsAfter === 150);

    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n▶  Test 5: Edge cases');
    // ═══════════════════════════════════════════════════════════════════════

    // 5a. Same invite code again – should fail (already used)
    const dupRes = await api('/api/invite/register', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, name: `SomeoneElse_${TS}` }),
    });
    ok('duplicate registration is rejected', dupRes.success === false);
    ok('duplicate says "already used"', dupRes.message && dupRes.message.toLowerCase().includes('already used'));

    // 5b. Register with same name as inviter – should fail
    const name2 = `TestInviter2_${TS}`;
    await api('/api/invite/generate', {
      method: 'POST',
      body: JSON.stringify({ name: name2 }),
    });
    // Generate a fresh code for this sub-test
    const genRes2 = await api('/api/invite/generate', {
      method: 'POST',
      body: JSON.stringify({ name: name2 }),
    });
    if (genRes2.success) {
      const sameNameRes = await api('/api/invite/register', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: genRes2.inviteCode, name: name2 }),
      });
      ok('same-name-as-inviter is rejected', sameNameRes.success === false);
    } else {
      console.log('  ⚠️  Skipped same-name test (generation failed)');
    }

    // 5c. Re-generating invite for same user returns the existing pending code
    const genRes3 = await api('/api/invite/generate', {
      method: 'POST',
      body: JSON.stringify({ name: INVITER_NAME }),
    });
    // The first code is already used (status=completed), so this should create a new one
    ok('re-generate after use gives a new code',
      genRes3.success === true && genRes3.inviteCode !== inviteCode);

    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n▶  Test 6: GET /api/invite/generate validates invite code');
    // ═══════════════════════════════════════════════════════════════════════
    const checkRes = await api(`/api/invite/generate?code=${inviteCode}`);
    ok('check used code returns failure', checkRes.success === false);
    ok('check message says already used', checkRes.message && checkRes.message.toLowerCase().includes('already used'));

    // Check the newly generated (pending) code
    if (genRes3.success) {
      const checkNew = await api(`/api/invite/generate?code=${genRes3.inviteCode}`);
      ok('check new pending code returns success', checkNew.success === true);
      ok('check returns inviter name', checkNew.inviterName === INVITER_NAME);
      ok('check returns bonus stars', checkNew.bonusStars === 50);
    }

    // 5d. Invalid / missing invite code
    const badRes = await api('/api/invite/register', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: 'ZZZZZZZZ', name: 'Someone' }),
    });
    ok('invalid invite code is rejected', badRes.success === false);

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
      console.log(`\n  Failures:`);
      failures.forEach(f => console.log(f));
    }
    console.log(`${'═'.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n💥 Test crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }

  if (failed > 0) {
    process.exit(1);
  }
})();
