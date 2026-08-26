#!/usr/bin/env node
import https from 'node:https';
import readline from 'node:readline';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ujcylnoztkvbloxdihyd';
let accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
let siteUrl = process.env.VERCEL_URL || process.env.SITE_URL || 'https://novel-weaver-ai.vercel.app';

if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
  siteUrl = `https://${siteUrl}`;
}

const redirectUrls = [
  siteUrl,
  `${siteUrl.replace(/\/+$/, '')}/**`,
  'https://*.vercel.app/**',
  'http://localhost:5173/**',
  'http://localhost:3000/**',
  'http://localhost:3006/**'
];

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function updateSupabaseConfig(token) {
  const body = JSON.stringify({
    site_url: siteUrl,
    uri_allow_list: redirectUrls.join(',')
  });

  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${PROJECT_REF}/config/auth`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Supabase Management API returned ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('====================================================');
  console.log(' Supabase & Vercel Authentication Auto-Configurator');
  console.log('====================================================\n');
  console.log(`Target Project: ${PROJECT_REF}`);
  console.log(`Target Site URL: ${siteUrl}`);
  console.log(`Allowed Redirect URLs:\n - ${redirectUrls.join('\n - ')}\n`);

  if (!accessToken) {
    console.log('To update Supabase remotely via CLI, you need a Personal Access Token.');
    console.log('Get one from: https://supabase.com/dashboard/account/tokens\n');
    accessToken = await prompt('Enter your Supabase Personal Access Token (or press Enter to skip): ');
  }

  if (!accessToken) {
    console.log('\n[!] No access token provided. You can run:');
    console.log(`    $env:SUPABASE_ACCESS_TOKEN="sbp_your_token"; node scripts/configure-auth.mjs`);
    console.log('\nOr configure it directly in the Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/auth/url-configuration');
    console.log(`2. Set Site URL to: ${siteUrl}`);
    console.log(`3. Add Redirect URLs: ${redirectUrls.join(', ')}`);
    return;
  }

  try {
    console.log('\nUpdating Supabase Auth configuration...');
    await updateSupabaseConfig(accessToken);
    console.log(' SUCCESS! Site URL and Redirect URLs have been successfully updated in Supabase.');
  } catch (err) {
    console.error('\n Error updating Supabase:', err.message);
  }
}

main();
