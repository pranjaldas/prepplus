// Checks that the PrepPulse schema is installed in your Supabase project.
// Usage: npm run verify:db   (reads .env.local)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    console.error('Could not read .env.local. Copy .env.local.example to .env.local first.');
    process.exit(1);
  }
}

loadEnv('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  SUPABASE_SERVICE_ROLE_KEY: service,
}).filter(([, v]) => !v || v.startsWith('your-') || v.includes('your-project-ref'));
if (missing.length) {
  console.error(`Fill in these values in .env.local: ${missing.map(([k]) => k).join(', ')}`);
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const pub = createClient(url, anon, { auth: { persistSession: false } });
let failed = false;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const bad = (msg) => {
  failed = true;
  console.log(`  ✘ ${msg}`);
};

console.log(`Checking ${url}\n`);

console.log('Tables (service-role key):');
for (const table of ['profiles', 'exams', 'exam_attempts', 'candidate_answers']) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  if (error) bad(`${table}: ${error.message}`);
  else ok(`${table} (${count ?? 0} rows)`);
}

console.log('\nHelper function:');
{
  const { error } = await admin.rpc('is_admin');
  if (error) bad(`is_admin(): ${error.message}`);
  else ok('is_admin() exists');
}

console.log('\nRow Level Security (anon key should see nothing):');
for (const table of ['profiles', 'exams', 'exam_attempts', 'candidate_answers']) {
  const { data, error } = await pub.from(table).select('id').limit(1);
  if (error) bad(`${table}: ${error.message}`);
  else if (data.length > 0) bad(`${table}: anonymous users can read rows. RLS is not enabled!`);
  else ok(`${table} hidden from anonymous users`);
}

console.log('\nAdmins:');
{
  const { data, error } = await admin.from('profiles').select('email').eq('role', 'ADMIN');
  if (error) bad(error.message);
  else if (data.length === 0) console.log('  • No admin yet. Register in the app, then promote yourself (see README).');
  else ok(`Admin(s): ${data.map((r) => r.email).join(', ')}`);
}

console.log(failed ? '\nSome checks failed. See above.' : '\nDatabase is ready.');
process.exit(failed ? 1 : 0);
