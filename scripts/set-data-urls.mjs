/**
 * One-time migration: Set data_url on existing tournaments.
 * 
 * Run: node scripts/set-data-urls.mjs
 * 
 * Requires DATABASE_URL env var (same as Vercel uses).
 * Get it from Vercel: vercel env pull .env.local
 * Then: node --env-file=.env.local scripts/set-data-urls.mjs
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Run: vercel env pull .env.local && node --env-file=.env.local scripts/set-data-urls.mjs');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const DATA_URLS = {
  'nc2026': 'https://www.rugbypass.com/nations-championship/fixtures-results/',
  'srp2026': 'https://www.rugbypass.com/super-rugby-pacific/fixtures-results/',
  'rc2026': 'https://www.rugbypass.com/rugby-championship/fixtures-results/',
  '6n2026': 'https://www.rugbypass.com/six-nations/fixtures-results/',
};

async function main() {
  console.log('Setting data_url on tournaments...\n');

  for (const [id, dataUrl] of Object.entries(DATA_URLS)) {
    const result = await sql`
      UPDATE tournaments 
      SET data_url = ${dataUrl}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, data_url
    `;
    if (result.length > 0) {
      console.log(`  ✓ ${id} → ${dataUrl}`);
    } else {
      console.log(`  - ${id} (not found in DB, skipping)`);
    }
  }

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
