#!/usr/bin/env node

import dotenv from 'dotenv'
import { validateEmailConfig } from '../lib/email-config.js'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

async function testEmailConfiguration() {
  console.log('\n🔍 Testing Email Configuration...\n')

  try {
    const report = await validateEmailConfig()

    console.log('📊 Configuration Report:')
    console.log('────────────────────────')
    console.log(`✅ Overall Success:        ${report.overall.success ? 'PASS' : 'FAIL'}`)
    console.log(`📈 Configuration Score:    ${report.overall.score}/100`)
    console.log(`🕒 Timestamp:              ${report.timestamp}\n`)

    console.log('🌍 Environment Variables:')
    console.log(`   ▸ Success: ${report.environment.success ? '✅ Yes' : '❌ No'}`)
    if (report.environment.errors.length > 0) {
      console.log('   ▸ Errors:')
      report.environment.errors.forEach(error => console.log(`     ❌ ${error}`))
    }
    if (report.environment.warnings.length > 0) {
      console.log('   ▸ Warnings:')
      report.environment.warnings.forEach(warning => console.log(`     ⚠️ ${warning}`))
    }
    console.log()

    console.log('📧 SendGrid Setup:')
    console.log(`   ▸ Success:              ${report.sendgrid.success ? '✅ Yes' : '❌ No'}`)
    console.log(`   ▸ API Key Valid:        ${report.sendgrid.details.apiKeyValid ? '✅' : '❌'}`)
    console.log(`   ▸ Connection Established: ${report.sendgrid.details.connectionEstablished ? '✅' : '❌'}`)
    console.log(`   ▸ Permissions Valid:    ${report.sendgrid.details.permissionsValid ? '✅' : '❌'}`)
    if (report.sendgrid.errors.length > 0) {
      console.log('   ▸ Errors:')
      report.sendgrid.errors.forEach(error => console.log(`     ❌ ${error}`))
    }
    console.log()

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:')
      report.recommendations.forEach(rec => console.log(`   • ${rec}`))
    }

    console.log('\n✅ Email configuration test completed.\n')

  } catch (error) {
    console.error('\n❌ Failed to test email configuration:')
    console.error(`   ↳ ${error.message}\n`)
    process.exit(1)
  }
}

testEmailConfiguration()
