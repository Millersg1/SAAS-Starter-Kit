/**
 * Fix Stripe Keys in .env File
 * 
 * This script updates the Stripe keys in your .env file with the correct format
 */

import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

// Correct Stripe keys from ENV_VARIABLES.md
const correctKeys = {
  STRIPE_SECRET_KEY: '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',
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51SxRSDH7DLU0lDSa8dx5PyKrxYV0d1KYBw7y39gbd8A7vlpjvIIi7cFbBbGQoLui6Tv0G4oG7uzdO1fG2abBLKDc00n5rVMlJq'
};

console.log('======================================== - fix-stripe-keys.js:18');
console.log('Fixing Stripe Keys in .env - fix-stripe-keys.js:19');
console.log('========================================\n - fix-stripe-keys.js:20');

try {
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found! - fix-stripe-keys.js:25');
    console.error('Please create a .env file first. - fix-stripe-keys.js:26');
    process.exit(1);
  }

  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Create backup
  const backupPath = path.join(process.cwd(), '.env.backup');
  fs.writeFileSync(backupPath, envContent);
  console.log('✅ Backup created: .env.backup\n - fix-stripe-keys.js:36');

  // Update or add Stripe keys
  let updated = false;
  
  // Update STRIPE_SECRET_KEY
  if (envContent.includes('STRIPE_SECRET_KEY=')) {
    const regex = /STRIPE_SECRET_KEY=.*/;
    envContent = envContent.replace(regex, `STRIPE_SECRET_KEY=${correctKeys.STRIPE_SECRET_KEY}`);
    console.log('✅ Updated STRIPE_SECRET_KEY - fix-stripe-keys.js:45');
    updated = true;
  } else {
    envContent += `\nSTRIPE_SECRET_KEY=${correctKeys.STRIPE_SECRET_KEY}`;
    console.log('✅ Added STRIPE_SECRET_KEY - fix-stripe-keys.js:49');
    updated = true;
  }

  // Update STRIPE_PUBLISHABLE_KEY
  if (envContent.includes('STRIPE_PUBLISHABLE_KEY=')) {
    const regex = /STRIPE_PUBLISHABLE_KEY=.*/;
    envContent = envContent.replace(regex, `STRIPE_PUBLISHABLE_KEY=${correctKeys.STRIPE_PUBLISHABLE_KEY}`);
    console.log('✅ Updated STRIPE_PUBLISHABLE_KEY - fix-stripe-keys.js:57');
  } else {
    envContent += `\nSTRIPE_PUBLISHABLE_KEY=${correctKeys.STRIPE_PUBLISHABLE_KEY}`;
    console.log('✅ Added STRIPE_PUBLISHABLE_KEY - fix-stripe-keys.js:60');
  }

  // Add STRIPE_WEBHOOK_SECRET if not present
  if (!envContent.includes('STRIPE_WEBHOOK_SECRET=')) {
    envContent += `\nSTRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here`;
    console.log('✅ Added STRIPE_WEBHOOK_SECRET placeholder - fix-stripe-keys.js:66');
  }

  // Write updated content
  fs.writeFileSync(envPath, envContent);

  console.log('\n======================================== - fix-stripe-keys.js:72');
  console.log('✅ Stripe keys updated successfully! - fix-stripe-keys.js:73');
  console.log('========================================\n - fix-stripe-keys.js:74');

  // Verify the keys
  console.log('Verifying keys...\n - fix-stripe-keys.js:77');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('STRIPE_SECRET_KEY=')) {
      const key = line.split('=')[1];
      if (key.startsWith('sk_live_')) {
        console.log('✅ STRIPE_SECRET_KEY format: VALID - fix-stripe-keys.js:83');
        console.log(`${key.substring(0, 20)}... - fix-stripe-keys.js:84`);
      } else {
        console.log('❌ STRIPE_SECRET_KEY format: INVALID - fix-stripe-keys.js:86');
      }
    }
    if (line.startsWith('STRIPE_PUBLISHABLE_KEY=')) {
      const key = line.split('=')[1];
      if (key.startsWith('pk_live_')) {
        console.log('✅ STRIPE_PUBLISHABLE_KEY format: VALID - fix-stripe-keys.js:92');
        console.log(`${key.substring(0, 20)}... - fix-stripe-keys.js:93`);
      } else {
        console.log('❌ STRIPE_PUBLISHABLE_KEY format: INVALID - fix-stripe-keys.js:95');
      }
    }
  });

  console.log('\n======================================== - fix-stripe-keys.js:100');
  console.log('Next Steps: - fix-stripe-keys.js:101');
  console.log('======================================== - fix-stripe-keys.js:102');
  console.log('1. Run: node createstripeproducts.js - fix-stripe-keys.js:103');
  console.log('2. Configure webhook in Stripe Dashboard - fix-stripe-keys.js:104');
  console.log('3. Update STRIPE_WEBHOOK_SECRET in .env - fix-stripe-keys.js:105');
  console.log('');

} catch (error) {
  console.error('\n❌ Error: - fix-stripe-keys.js:109', error.message);
  process.exit(1);
}
