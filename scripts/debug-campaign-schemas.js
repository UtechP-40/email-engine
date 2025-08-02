#!/usr/bin/env node
// scripts/debug-campaign-schemas.js
import { getDatabase } from '../lib/db.js';
import { validateCampaignSchema } from '../lib/validation.js';

async function debugCampaignSchemas() {
  console.log('🔍 Debugging Campaign Schemas...\n');

  try {
    const db = await getDatabase();
    const campaigns = await db.collection('campaigns').find({}).toArray();

    if (campaigns.length === 0) {
      console.log('📭 No campaigns found in database');
      return;
    }

    console.log(`📊 Found ${campaigns.length} campaigns to validate\n`);

    let validCount = 0;
    let invalidCount = 0;

    for (const campaign of campaigns) {
      console.log(`🔍 Validating campaign: ${campaign.name} (ID: ${campaign._id})`);
      
      if (!campaign.schema) {
        console.log('❌ No schema found');
        invalidCount++;
        continue;
      }

      const validation = validateCampaignSchema(campaign.schema);
      
      if (validation.valid) {
        console.log('✅ Schema is valid');
        console.log(`   - Nodes: ${campaign.schema.nodes?.length || 0}`);
        console.log(`   - Edges: ${campaign.schema.edges?.length || 0}`);
        validCount++;
      } else {
        console.log(`❌ Schema is invalid: ${validation.error}`);
        console.log('   Schema structure:');
        console.log(`   - Has nodes: ${!!campaign.schema.nodes}`);
        console.log(`   - Nodes count: ${campaign.schema.nodes?.length || 0}`);
        console.log(`   - Has edges: ${!!campaign.schema.edges}`);
        console.log(`   - Edges count: ${campaign.schema.edges?.length || 0}`);
        
        if (campaign.schema.nodes && campaign.schema.nodes.length > 0) {
          console.log('   - Node types:', campaign.schema.nodes.map(n => `${n.type}(${n.id})`).join(', '));
          
          // Check each node for data issues
          campaign.schema.nodes.forEach((node, index) => {
            if (!node.data) {
              console.log(`     ⚠️ Node ${index + 1} (${node.id}) missing data object`);
            } else {
              console.log(`     ✓ Node ${index + 1} (${node.id}) has data:`, Object.keys(node.data));
            }
          });
        }
        
        invalidCount++;
      }
      console.log('');
    }

    console.log('📈 Summary:');
    console.log(`✅ Valid campaigns: ${validCount}`);
    console.log(`❌ Invalid campaigns: ${invalidCount}`);
    
    if (invalidCount > 0) {
      console.log('\n💡 To fix invalid campaigns, you can:');
      console.log('1. Edit them in the campaign builder and save again');
      console.log('2. Delete and recreate them');
      console.log('3. Run a migration script to fix the schema structure');
    }

  } catch (error) {
    console.error('💥 Error debugging campaigns:', error);
  }

  process.exit(0);
}

// Run the debug script
debugCampaignSchemas();