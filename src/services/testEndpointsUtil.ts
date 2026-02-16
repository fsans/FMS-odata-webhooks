/**
 * Utility to test FileMaker OData webhook endpoints
 * This is a standalone utility that can be run from the browser console
 * to validate which HTTP methods are supported by each endpoint
 */

import { fileMakerService } from './filemaker'
import { endpointValidator } from './endpointValidator'

export async function validateAllEndpoints(database: string) {
  try {
    console.log('🔍 Starting endpoint validation...')

    const report = await endpointValidator.validateWebhookEndpoints(database)

    console.log('\n' + endpointValidator.generateReport(report))

    // Also log JSON for programmatic access
    console.log('\n📊 JSON Export:')
    console.log(endpointValidator.exportJSON(report))

    return report
  } catch (error) {
    console.error('❌ Validation failed:', error)
    throw error
  }
}

/**
 * Quick test to verify basic endpoint connectivity
 */
export async function quickTest(database: string) {
  try {
    console.log('⚡ Running quick connectivity test...')

    // Test 1: Get all webhooks (should work with GET or POST)
    console.log('\n1️⃣ Testing Webhook.GetAll...')
    try {
      const webhooks = await fileMakerService.getAllWebhooks(database)
      console.log(`✅ Webhook.GetAll works! Found ${webhooks.length} webhooks`)
    } catch (e) {
      console.error(`❌ Webhook.GetAll failed:`, e)
    }

    // Test 2: Get metadata (should work with GET)
    console.log('\n2️⃣ Testing $metadata...')
    try {
      const metadata = await fileMakerService.getMetadata(database)
      console.log(`✅ $metadata works! Found ${metadata.length} tables`)
    } catch (e) {
      console.error(`❌ $metadata failed:`, e)
    }

    console.log('\n✨ Quick test complete')
  } catch (error) {
    console.error('❌ Quick test failed:', error)
    throw error
  }
}

/**
 * Test creating a webhook (requires valid table name)
 */
export async function testCreateWebhook(database: string, tableName: string) {
  try {
    console.log(`🆕 Testing webhook creation for table: ${tableName}`)

    const webhook = await fileMakerService.createWebhook(database, {
      webhook: 'http://example.com/test-webhook',
      tableName,
      select: 'id',
      notifySchemaChanges: false,
    })

    console.log(`✅ Webhook created successfully!`)
    console.log(`   ID: ${webhook.id}`)
    console.log(`   URL: ${webhook.webhook}`)
    console.log(`   Table: ${webhook.tableName}`)

    return webhook
  } catch (error) {
    console.error('❌ Webhook creation failed:', error)
    throw error
  }
}

/**
 * Test deleting a webhook
 */
export async function testDeleteWebhook(database: string, webhookId: string) {
  try {
    console.log(`🗑️ Testing webhook deletion for ID: ${webhookId}`)

    await fileMakerService.deleteWebhook(database, webhookId)

    console.log(`✅ Webhook deleted successfully!`)
  } catch (error) {
    console.error('❌ Webhook deletion failed:', error)
    throw error
  }
}

/**
 * Test invoking a webhook (manually trigger it)
 */
export async function testInvokeWebhook(database: string, webhookId: string, tableName?: string) {
  try {
    console.log(`🧪 Testing webhook invocation for ID: ${webhookId}`)

    await fileMakerService.invokeWebhook(database, webhookId, tableName)

    console.log(`✅ Webhook invoked successfully!`)
  } catch (error) {
    console.error('❌ Webhook invocation failed:', error)
    throw error
  }
}

/**
 * Test webhook name parameter support
 * Investigates whether FileMaker OData API accepts a "name" parameter when creating webhooks
 */
export async function testWebhookNameSupport(database: string, tableName: string) {
  try {
    console.log(`🔍 Testing webhook name parameter support...`)

    // Test 1: Create webhook WITHOUT name parameter (baseline)
    console.log(`\n1️⃣ Creating baseline webhook (without name)...`)
    const baselineWebhook = await fileMakerService.createWebhook(database, {
      webhook: 'http://example.com/test-baseline',
      tableName,
      notifySchemaChanges: false,
      select: 'id',
    })
    console.log(`✅ Baseline webhook created with ID: ${baselineWebhook.id}`)
    console.log(`Baseline webhook data:`, baselineWebhook)

    // Check if name field exists in baseline
    const baselineFields = Object.keys(baselineWebhook)
    console.log(`\nBaseline webhook fields: ${baselineFields.join(', ')}`)
    
    if ('name' in baselineWebhook) {
      console.log(`⚠️ Name field exists in baseline webhook:`, (baselineWebhook as any).name)
    } else {
      console.log(`ℹ️ Name field NOT in baseline webhook response`)
    }

    // Test 2: Try to create webhook WITH name parameter
    console.log(`\n2️⃣ Attempting to create webhook WITH name parameter...`)
    try {
      const nameWebhookParams = {
        name: 'Test Webhook With Name',
        webhook: 'http://example.com/test-with-name',
        tableName,
        notifySchemaChanges: false,
        select: 'id',
      }

      // Use the service's internal fetch mechanism via proxy
      const baseUrl = `/fmi/odata/v4/${database}/Webhook.Add`
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nameWebhookParams),
      })

      const data = await response.json()
      console.log(`Status: ${response.status}`)
      console.log(`Response:`, data)

      if (response.ok && data.webhookResult?.webhookID) {
        console.log(`✅ Webhook created WITH name parameter - name parameter was ACCEPTED`)
        const webhookId = data.webhookResult.webhookID

        // Fetch to see if name is stored
        console.log(`\n3️⃣ Fetching webhook to check if name was stored...`)
        const allWebhooks = await fileMakerService.getAllWebhooks(database)
        const createdWebhook = allWebhooks.find((w) => w.id === String(webhookId))

        if (createdWebhook) {
          console.log(`Webhook data:`, createdWebhook)
          const webhookFields = Object.keys(createdWebhook)
          console.log(`Webhook fields: ${webhookFields.join(', ')}`)
          
          if ('name' in createdWebhook) {
            console.log(`✅ Name field EXISTS in webhook:`, (createdWebhook as any).name)
          } else {
            console.log(`⚠️ Name field NOT returned in webhook data (parameter accepted but not stored/returned)`)
          }
        }

        // Clean up
        await fileMakerService.deleteWebhook(database, String(webhookId))
        console.log(`Cleaned up test webhook`)
      } else {
        console.log(`❌ Failed to create webhook with name parameter`)
        console.log(`Error details:`, data)
      }
    } catch (nameError) {
      console.error(`❌ Error testing name parameter:`, nameError)
    }

    // Clean up baseline
    console.log(`\n4️⃣ Cleaning up baseline webhook...`)
    await fileMakerService.deleteWebhook(database, baselineWebhook.id)
    console.log(`✅ Cleanup complete`)

    console.log(`\n📋 Summary:`)
    console.log(`- Baseline webhook response fields: ${baselineFields.join(', ')}`)
    console.log(`- Name parameter: Check results in step 2 above`)
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

/**
 * Full integration test: create, list, delete
 */
export async function fullIntegrationTest(database: string, tableName: string) {
  try {
    console.log('🧪 Running full integration test...\n')

    // Step 1: Get initial webhook count
    console.log('Step 1: Getting initial webhook list...')
    const initialWebhooks = await fileMakerService.getAllWebhooks(database)
    console.log(`✅ Found ${initialWebhooks.length} existing webhooks\n`)

    // Step 2: Create a test webhook
    console.log('Step 2: Creating test webhook...')
    const testWebhook = await testCreateWebhook(database, tableName)
    console.log()

    // Step 3: Verify it appears in the list
    console.log('Step 3: Verifying webhook appears in list...')
    const afterCreate = await fileMakerService.getAllWebhooks(database)
    const found = afterCreate.find((w) => w.id === testWebhook.id)
    if (found) {
      console.log(`✅ Webhook found in list\n`)
    } else {
      console.log(`⚠️ Webhook not found in list (may be timing issue)\n`)
    }

    // Step 4: Delete the webhook
    console.log('Step 4: Deleting test webhook...')
    await testDeleteWebhook(database, testWebhook.id)
    console.log()

    // Step 5: Verify it's gone
    console.log('Step 5: Verifying webhook is deleted...')
    const afterDelete = await fileMakerService.getAllWebhooks(database)
    const stillExists = afterDelete.find((w) => w.id === testWebhook.id)
    if (!stillExists) {
      console.log(`✅ Webhook successfully deleted\n`)
    } else {
      console.log(`⚠️ Webhook still appears in list (may be timing issue)\n`)
    }

    console.log('✨ Full integration test complete!')
    return {
      success: true,
      initialCount: initialWebhooks.length,
      finalCount: afterDelete.length,
      testWebhookId: testWebhook.id,
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error)
    throw error
  }
}

/**
 * Export test utilities to window for console access
 */
if (typeof window !== 'undefined') {
  ;(window as any).FileMakerTests = {
    validateAllEndpoints,
    quickTest,
    testCreateWebhook,
    testDeleteWebhook,
    testInvokeWebhook,
    testWebhookNameSupport,
    fullIntegrationTest,
  }
  console.log(
    '📌 Test utilities available as window.FileMakerTests.*\n' +
      '   - validateAllEndpoints(database)\n' +
      '   - quickTest(database)\n' +
      '   - testCreateWebhook(database, tableName)\n' +
      '   - testDeleteWebhook(database, webhookId)\n' +
      '   - testInvokeWebhook(database, webhookId, tableName?)\n' +
      '   - testWebhookNameSupport(database, tableName)\n' +
      '   - fullIntegrationTest(database, tableName)'
  )
}
