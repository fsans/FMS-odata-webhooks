import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { webhookTracker } from '@/services/webhookTracker'
import { webhookTestFramework } from '@/services/webhookTestFramework'
import { patternAnalyzer } from '@/services/patternAnalyzer'
import { documentationGenerator } from '@/services/documentationGenerator'
import { endpointTester } from '@/services/endpointTester'
import { useFileMaker } from '@/contexts/FileMakerContext'

interface TestStatus {
  isRunning: boolean
  currentTest: string | null
  progress: number
  totalTests: number
  completedTests: number
}

interface AnalysisResults {
  summary: any
  patterns: any
  recommendations: string[]
  lastUpdated: Date
}

export default function WebhookIdResearchPanel() {
  const { connection, currentDatabase } = useFileMaker()
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    currentTest: null,
    progress: 0,
    totalTests: 0,
    completedTests: 0
  })
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const updateTestStatus = (status: Partial<TestStatus>) => {
    setTestStatus(prev => ({ ...prev, ...status }))
  }

  const runAllTests = async () => {
    if (!connection || !currentDatabase) {
      addLog('❌ No FileMaker connection available')
      return
    }

    updateTestStatus({ isRunning: true, currentTest: 'Initializing', progress: 0 })
    addLog('🚀 Starting comprehensive webhook ID analysis...')

    try {
      // Clear previous data
      webhookTracker.clearLogs()
      webhookTestFramework.clearResults()
      addLog('🧹 Cleared previous test data')

      // Get test scenarios
      const scenarios = webhookTracker.generateTestScenarios()
      updateTestStatus({ totalTests: scenarios.length, completedTests: 0 })
      addLog(`📋 Found ${scenarios.length} test scenarios to run`)

      // Run each scenario
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i]
        updateTestStatus({ 
          currentTest: scenario.name, 
          completedTests: i,
          progress: (i / scenarios.length) * 100 
        })
        
        addLog(`🧪 Running test: ${scenario.name}`)
        addLog(`📝 ${scenario.description}`)

        try {
          const result = await webhookTestFramework.runScenario(scenario, currentDatabase.name)
          addLog(result.success ? 
            `✅ Test completed successfully` : 
            `❌ Test failed: ${result.errors.join(', ')}`
          )
        } catch (error) {
          addLog(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      updateTestStatus({ progress: 100, completedTests: scenarios.length })
      addLog('🎉 All tests completed!')

      // Generate analysis
      addLog('📊 Analyzing patterns...')
      const analysis = patternAnalyzer.analyzeCurrentState()
      setAnalysisResults({
        summary: analysis.summary,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        lastUpdated: new Date()
      })

      addLog(`📈 Analysis complete - Predictability: ${(analysis.summary.predictability * 100).toFixed(1)}%`)

    } catch (error) {
      addLog(`💥 Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      updateTestStatus({ isRunning: false, currentTest: null })
    }
  }

  const runEndpointTest = async () => {
    if (!connection || !currentDatabase) {
      addLog('❌ No FileMaker connection available')
      return
    }

    updateTestStatus({ isRunning: true, currentTest: 'Endpoint Testing' })
    addLog('🔍 Testing FileMaker webhook endpoints...')

    try {
      // Set up the endpoint tester with current connection
      endpointTester.setConnection(connection)
      
      addLog('📡 Testing all HTTP methods on webhook endpoints...')
      const testSuite = await endpointTester.testWebhookEndpoints(currentDatabase.name)
      
      addLog(`✅ Endpoint testing complete!`)
      addLog(`📊 Found ${testSuite.summary.supportedMethods.length} supported methods`)
      addLog(`❌ Found ${testSuite.summary.unsupportedMethods.length} unsupported methods`)
      
      if (testSuite.summary.unexpectedBehaviors.length > 0) {
        addLog(`⚠️ Found ${testSuite.summary.unexpectedBehaviors.length} unexpected behaviors`)
      }

      // Generate and display summary
      testSuite.summary.supportedMethods.forEach(method => {
        addLog(`✅ ${method}`)
      })
      
      testSuite.summary.unsupportedMethods.forEach(method => {
        addLog(`❌ ${method}`)
      })

      testSuite.summary.unexpectedBehaviors.forEach(behavior => {
        addLog(`⚠️ ${behavior}`)
      })

      // Export detailed report
      const report = endpointTester.generateTestReport(testSuite)
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webhook-endpoint-test-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addLog('📄 Detailed endpoint test report exported')

    } catch (error) {
      addLog(`💥 Endpoint test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      updateTestStatus({ isRunning: false, currentTest: null })
    }
  }

  const runSpecificTest = async (testType: string) => {
    if (!connection || !currentDatabase) {
      addLog('❌ No FileMaker connection available')
      return
    }

    updateTestStatus({ isRunning: true, currentTest: testType })

    try {
      addLog(`🧪 Running specific test: ${testType}`)

      let result
      switch (testType) {
        case 'sequential':
          result = await webhookTestFramework.testSequentialCreation(currentDatabase.name, 10)
          break
        case 'immediate-recycle':
          result = await webhookTestFramework.testDeleteRecreateImmediate(currentDatabase.name)
          break
        case 'delayed-recycle':
          result = await webhookTestFramework.testDeleteRecreateDelayed(currentDatabase.name, 5000)
          break
        case 'batch':
          result = await webhookTestFramework.testBatchOperations(currentDatabase.name)
          break
        default:
          throw new Error(`Unknown test type: ${testType}`)
      }

      addLog(result.success ? '✅ Test completed successfully' : '❌ Test failed')
      
      // Update analysis
      const analysis = patternAnalyzer.analyzeCurrentState()
      setAnalysisResults({
        summary: analysis.summary,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        lastUpdated: new Date()
      })

    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      updateTestStatus({ isRunning: false, currentTest: null })
    }
  }

  const exportDocumentation = () => {
    try {
      const markdown = documentationGenerator.exportMarkdown()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webhook-id-analysis-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addLog('📄 Documentation exported successfully')
    } catch (error) {
      addLog(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const exportRawData = () => {
    try {
      const data = webhookTracker.exportLogs()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `webhook-id-raw-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addLog('📊 Raw data exported successfully')
    } catch (error) {
      addLog(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    // Update analysis every few seconds if tests are running
    const interval = setInterval(() => {
      if (testStatus.isRunning) {
        const analysis = patternAnalyzer.analyzeCurrentState()
        setAnalysisResults({
          summary: analysis.summary,
          patterns: analysis.patterns,
          recommendations: analysis.recommendations,
          lastUpdated: new Date()
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [testStatus.isRunning])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>FileMaker Webhook ID Reverse Engineering</CardTitle>
          <CardDescription>
            Systematic analysis of FileMaker Server's webhook ID assignment behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={runAllTests} 
              disabled={testStatus.isRunning || !connection || !currentDatabase}
              className="flex-1"
            >
              {testStatus.isRunning ? '⏳ Running Tests...' : '🚀 Run Complete Analysis'}
            </Button>
            <Button 
              onClick={runEndpointTest} 
              disabled={testStatus.isRunning || !connection || !currentDatabase}
              variant="outline"
            >
              🔍 Test Endpoints
            </Button>
            <Button 
              onClick={exportDocumentation} 
              variant="outline"
              disabled={!analysisResults}
            >
              📄 Export Report
            </Button>
            <Button 
              onClick={exportRawData} 
              variant="outline"
            >
              📊 Export Raw Data
            </Button>
          </div>

          {testStatus.isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Test: {testStatus.currentTest}</span>
                <span>{testStatus.completedTests}/{testStatus.totalTests} completed</span>
              </div>
              <Progress value={testStatus.progress} className="w-full" />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tests">Individual Tests</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="logs">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {analysisResults ? (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Operations:</span>
                          <Badge>{analysisResults.summary.totalOperations}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Unique Webhooks:</span>
                          <Badge>{analysisResults.summary.uniqueWebhooks}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Recycling Detected:</span>
                          <Badge variant={analysisResults.summary.recyclingDetected ? "destructive" : "default"}>
                            {analysisResults.summary.recyclingDetected ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Predictability:</span>
                          <Badge variant={(analysisResults.summary.predictability * 100) > 80 ? "default" : "secondary"}>
                            {(analysisResults.summary.predictability * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysisResults.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Run the complete analysis to see results and recommendations.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => runSpecificTest('sequential')}
                  disabled={testStatus.isRunning || !connection || !currentDatabase}
                  variant="outline"
                >
                  📈 Sequential Creation Test
                </Button>
                <Button 
                  onClick={() => runSpecificTest('immediate-recycle')}
                  disabled={testStatus.isRunning || !connection || !currentDatabase}
                  variant="outline"
                >
                  🔄 Immediate Recycling Test
                </Button>
                <Button 
                  onClick={() => runSpecificTest('delayed-recycle')}
                  disabled={testStatus.isRunning || !connection || !currentDatabase}
                  variant="outline"
                >
                  ⏰ Delayed Recycling Test
                </Button>
                <Button 
                  onClick={() => runSpecificTest('batch')}
                  disabled={testStatus.isRunning || !connection || !currentDatabase}
                  variant="outline"
                >
                  📦 Batch Operations Test
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Descriptions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">Sequential Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates multiple webhooks in sequence to test if IDs follow a predictable pattern.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Immediate Recycling</h4>
                    <p className="text-sm text-muted-foreground">
                      Deletes a webhook and immediately creates a new one to test if IDs are recycled.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Delayed Recycling</h4>
                    <p className="text-sm text-muted-foreground">
                      Deletes a webhook, waits, then creates a new one to test timing-based recycling.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Batch Operations</h4>
                    <p className="text-sm text-muted-foreground">
                      Complex sequence with multiple creates and deletes to test system behavior under load.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              {analysisResults ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pattern Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Sequential Pattern:</span>
                          <Badge variant={analysisResults.patterns.sequential ? "default" : "secondary"}>
                            {analysisResults.patterns.sequential ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Recycling Pattern:</span>
                          <Badge variant={analysisResults.patterns.recycled ? "destructive" : "default"}>
                            {analysisResults.patterns.recycled ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Gap Size:</span>
                          <span>{analysisResults.patterns.averageGapSize.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Maximum Gap Size:</span>
                          <span>{analysisResults.patterns.maxGapSize}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Current ID State</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2 text-sm">
                          <div><strong>Active Operations:</strong> {webhookTracker.getLogs().filter(l => l.success).length}</div>
                          <div><strong>Tracked Patterns:</strong> {webhookTracker.getPatterns().length}</div>
                          <div><strong>Last Updated:</strong> {analysisResults.lastUpdated.toLocaleString()}</div>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Run tests to see detailed analysis results.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-1 font-mono text-sm">
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <div key={index} className="p-1 hover:bg-muted rounded">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No activity yet. Run tests to see logs.</div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
