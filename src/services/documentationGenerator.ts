import { webhookTracker } from './webhookTracker'
import { webhookTestFramework } from './webhookTestFramework'
import { patternAnalyzer } from './patternAnalyzer'

interface DocumentationSection {
  title: string
  content: string
  type: 'markdown' | 'json' | 'table'
  data?: any
}

interface CompleteDocumentation {
  title: string
  generatedAt: string
  version: string
  sections: DocumentationSection[]
  summary: {
    totalTests: number
    successfulTests: number
    keyFindings: string[]
    recommendations: string[]
  }
}

class DocumentationGenerator {
  generateCompleteDocumentation(): CompleteDocumentation {
    const timestamp = new Date().toISOString()
    const analysis = patternAnalyzer.analyzeCurrentState()
    const testResults = webhookTestFramework.getTestResults()

    const sections: DocumentationSection[] = [
      {
        title: 'Executive Summary',
        content: this.generateExecutiveSummary(analysis),
        type: 'markdown'
      },
      {
        title: 'Methodology',
        content: this.generateMethodology(),
        type: 'markdown'
      },
      {
        title: 'Test Results',
        content: this.generateTestResults(testResults),
        type: 'markdown'
      },
      {
        title: 'ID Pattern Analysis',
        content: this.generateIdPatternAnalysis(analysis),
        type: 'markdown'
      },
      {
        title: 'Performance Metrics',
        content: this.generatePerformanceMetrics(analysis),
        type: 'table',
        data: analysis.timing
      },
      {
        title: 'Recycling Behavior',
        content: this.generateRecyclingAnalysis(analysis),
        type: 'markdown'
      },
      {
        title: 'Timeline Analysis',
        content: this.generateTimelineAnalysis(),
        type: 'markdown'
      },
      {
        title: 'Raw Data',
        content: 'Complete operation logs and patterns',
        type: 'json',
        data: {
          logs: webhookTracker.getLogs(),
          patterns: webhookTracker.getPatterns(),
          testResults: Array.from(testResults.entries()).map(([name, result]) => ({ name, result }))
        }
      }
    ]

    const keyFindings = this.extractKeyFindings(analysis)
    const recommendations = this.extractRecommendations(analysis)

    return {
      title: 'FileMaker Webhook ID Assignment Reverse Engineering Report',
      generatedAt: timestamp,
      version: '1.0.0',
      sections,
      summary: {
        totalTests: testResults.size,
        successfulTests: Array.from(testResults.values()).filter(r => r.success).length,
        keyFindings,
        recommendations
      }
    }
  }

  private generateExecutiveSummary(analysis: any): string {
    return `## Executive Summary

This report documents the reverse engineering analysis of FileMaker Server's webhook ID assignment behavior. The analysis was conducted through systematic testing and pattern recognition to understand how FileMaker generates, manages, and recycles webhook IDs.

### Key Discoveries

${analysis.summary.recyclingDetected ? 
  '🔍 **ID Recycling Detected**: FileMaker Server reuses deleted webhook IDs, making the system non-sequential and unpredictable for long-term references.' :
  '📈 **Sequential Assignment**: FileMaker Server assigns webhook IDs sequentially without recycling, making the system predictable.'
}

${analysis.summary.sequentialPattern ? 
  '✅ **Sequential Pattern**: IDs follow a predictable sequential pattern when no recycling occurs.' :
  '⚡ **Complex Pattern**: ID assignment follows a complex pattern requiring careful analysis.'
}

### Predictability Score: ${(analysis.summary.predictability * 100).toFixed(1)}%

${analysis.summary.predictability > 0.8 ? 
  'The ID assignment system is highly predictable and suitable for automation.' :
  analysis.summary.predictability > 0.5 ?
  'The ID assignment system has moderate predictability with some uncertainty.' :
  'The ID assignment system is unpredictable and requires robust handling strategies.'
}

### Impact on Webhook Management

${analysis.summary.recyclingDetected ? 
  'The delete-then-create editing approach will result in ID recycling, which may impact external systems that reference webhook IDs.' :
  'The delete-then-create editing approach will generate new sequential IDs, maintaining predictability.'
}

### Testing Scope

- **Total Operations Analyzed**: ${analysis.summary.totalOperations}
- **Unique Webhooks Tracked**: ${analysis.summary.uniqueWebhooks}
- **Test Scenarios Executed**: Multiple patterns including sequential creation, delete-recreate cycles, and batch operations
`
  }

  private generateMethodology(): string {
    return `## Methodology

### Research Approach

This analysis employed a systematic approach to reverse engineer FileMaker's webhook ID assignment behavior:

#### 1. Enhanced Logging System
- Comprehensive tracking of all webhook operations (create, delete, update)
- Detailed timing measurements and server response capture
- Session-based operation sequencing
- Metadata collection for pattern analysis

#### 2. Automated Test Framework
- **Sequential Creation Test**: Create multiple webhooks in sequence to observe ID patterns
- **Delete-Recreate Test**: Delete webhooks and immediately recreate to test recycling
- **Delayed Recycling Test**: Delete webhooks, wait, then recreate to test timing-based recycling
- **Batch Operations Test**: Complex sequences with multiple creates and deletes

#### 3. Pattern Analysis Engine
- Statistical analysis of ID assignment patterns
- Gap detection and recycling event identification
- Predictive modeling for next ID assignment
- Confidence scoring for predictions

#### 4. Data Collection Methods

\`\`\`typescript
// Example of tracked operation
{
  timestamp: "2026-02-15T12:00:00.000Z",
  operation: "create",
  webhookId: "5",
  database: "TestDB",
  timingMs: 234,
  success: true,
  serverResponse: { webhookID: 5 }
}
\`\`\`

#### 5. Test Scenarios

1. **Baseline Establishment**: Create 10 webhooks sequentially
2. **Recycling Detection**: Delete webhook #3, create new webhook, observe ID assignment
3. **Timing Analysis**: Vary delays between delete and create operations
4. **Stress Testing**: Batch operations with multiple concurrent changes

#### 6. Analysis Techniques

- **Sequential Pattern Detection**: Analyze if IDs follow n, n+1, n+2 pattern
- **Recycling Detection**: Identify if deleted IDs are reused
- **Gap Analysis**: Find gaps in ID sequences and their causes
- **Timing Correlation**: Analyze if timing affects ID assignment
- **Statistical Modeling**: Use probability to predict next ID assignment

### Validation Methods

- Multiple test runs to ensure consistency
- Cross-validation with different databases
- Server restart testing for persistence analysis
- Concurrent operation testing for race conditions

### Limitations

- Analysis based on single FileMaker Server instance
- Test environment may not reflect production load
- Some edge cases may require additional testing
- Server version-specific behaviors not fully explored
`
  }

  private generateTestResults(testResults: Map<string, any>): string {
    const results = Array.from(testResults.entries())
    const successful = results.filter(([_, result]) => result.success).length
    const total = results.length

    let content = `## Test Results

### Overview

- **Total Test Scenarios**: ${total}
- **Successful Tests**: ${successful}
- **Success Rate**: ${total > 0 ? ((successful / total) * 100).toFixed(1) : 0}%

### Individual Test Results

`

    results.forEach(([name, result]) => {
      content += `
#### ${name}

**Status**: ${result.success ? '✅ Success' : '❌ Failed'}
**Duration**: ${result.endTime ? result.endTime.getTime() - result.startTime.getTime() : 'N/A'}ms
**Operations**: ${result.operations.length}

${result.errors.length > 0 ? `**Errors**: ${result.errors.join(', ')}` : ''}

**Key Findings**:
${this.extractTestFindings(result)}
`
    })

    return content
  }

  private extractTestFindings(result: any): string {
    const findings: string[] = []
    
    result.operations.forEach((op: any) => {
      if (op.success && op.webhookId) {
        findings.push(`- ${op.operation} operation assigned ID ${op.webhookId}`)
      }
    })

    return findings.join('\n')
  }

  private generateIdPatternAnalysis(analysis: any): string {
    return `## ID Pattern Analysis

### Current State

- **Active Webhook IDs**: ${analysis.idAnalysis.currentIds.join(', ') || 'None'}
- **Deleted Webhook IDs**: ${analysis.idAnalysis.deletedIds.join(', ') || 'None'}
- **Detected Gaps**: ${analysis.idAnalysis.gaps.join(', ') || 'None'}

### Pattern Characteristics

- **Sequential Pattern**: ${analysis.patterns.sequential ? '✅ Detected' : '❌ Not detected'}
- **Recycling Behavior**: ${analysis.patterns.recycled ? '⚠️ Detected' : '✅ None detected'}
- **Average Gap Size**: ${analysis.patterns.averageGapSize.toFixed(2)}
- **Maximum Gap Size**: ${analysis.patterns.maxGapSize}

### Prediction Analysis

${analysis.idAnalysis.nextPredictedId ? 
`**Next Predicted ID**: ${analysis.idAnalysis.nextPredictedId}
**Prediction Confidence**: ${(analysis.idAnalysis.confidence * 100).toFixed(1)}%` :
'**Next ID**: Unpredictable due to complex pattern'
}

### Pattern Classification

${this.classifyPattern(analysis)}
`
  }

  private classifyPattern(analysis: any): string {
    if (analysis.patterns.sequential && !analysis.patterns.recycled) {
      return `**Pattern Type**: Pure Sequential
- IDs are assigned in perfect sequential order
- No recycling of deleted IDs
- Highly predictable behavior
- Suitable for automation and external references`
    } else if (!analysis.patterns.sequential && analysis.patterns.recycled) {
      return `**Pattern Type**: Complex Recycling
- IDs are recycled from deleted webhooks
- Non-sequential assignment
- Unpredictable for external references
- Requires robust ID handling strategies`
    } else if (analysis.patterns.sequential && analysis.patterns.recycled) {
      return `**Pattern Type**: Mixed Sequential with Recycling
- Generally sequential with occasional recycling
- Moderate predictability
- Some gaps in sequence
- Careful monitoring required`
    } else {
      return `**Pattern Type**: Complex/Unknown
- No clear sequential pattern
- Possible server-specific behavior
- Requires extensive testing
- Not suitable for predictable automation`
    }
  }

  private generatePerformanceMetrics(analysis: any): string {
    return `## Performance Metrics

| Metric | Value | Analysis |
|--------|-------|----------|
| Average Create Time | ${analysis.timing.averageCreateTime.toFixed(0)}ms | ${this.analyzeTiming(analysis.timing.averageCreateTime, 'create')} |
| Average Delete Time | ${analysis.timing.averageDeleteTime.toFixed(0)}ms | ${this.analyzeTiming(analysis.timing.averageDeleteTime, 'delete')} |
| Average Update Time | ${analysis.timing.averageUpdateTime.toFixed(0)}ms | ${this.analyzeTiming(analysis.timing.averageUpdateTime, 'update')} |
| Recycling Delay | ${analysis.timing.recyclingDelay.toFixed(0)}ms | ${this.analyzeTiming(analysis.timing.recyclingDelay, 'recycling')} |
`
  }

  private analyzeTiming(time: number, operation: string): string {
    if (time < 100) return `Excellent - Very fast ${operation}`
    if (time < 500) return `Good - Fast ${operation}`
    if (time < 1000) return `Acceptable - Moderate ${operation} speed`
    if (time < 2000) return `Slow - ${operation} could be optimized`
    return `Very Slow - ${operation} performance issues detected`
  }

  private generateRecyclingAnalysis(analysis: any): string {
    return `## Recycling Behavior Analysis

### Recycling Detection

${analysis.patterns.recycled ? 
`⚠️ **ID Recycling Detected**

FileMaker Server reuses webhook IDs from deleted webhooks. This has important implications:

**Impact**:
- External systems cannot rely on stable webhook IDs
- Delete-then-create editing may result in ID reuse
- Long-term ID references become unreliable
- Automation must account for potential ID changes

**Recycling Delay**: ${analysis.timing.recyclingDelay.toFixed(0)}ms
${analysis.timing.recyclingDelay < 5000 ? 
'- IDs are recycled almost immediately' :
  analysis.timing.recyclingDelay < 30000 ?
  '- IDs are recycled after a moderate delay' :
  '- IDs are recycled after significant delay'
}` :
`✅ **No Recycling Detected**

FileMaker Server does not reuse deleted webhook IDs:

**Impact**:
- External ID references remain stable
- Delete-then-create editing generates new IDs
- Predictable ID assignment pattern
- Suitable for long-term automation

**Behavior**: Sequential ID assignment without reuse`
}

### Recommendations for Webhook Management

${analysis.patterns.recycled ? 
`**For Recycling Systems**:
1. Use external ID mapping for stable references
2. Implement webhook identification by URL/parameters, not ID
3. Consider create-then-delete order to minimize recycling
4. Monitor ID changes in external systems
5. Implement robust error handling for ID changes` :
`**For Sequential Systems**:
1. Rely on predictable ID assignment
2. Use delete-then-create editing approach
3. Implement ID-based external references
4. Monitor for pattern changes
5. Use IDs for webhook identification`
}
`
  }

  private generateTimelineAnalysis(): string {
    const logs = webhookTracker.getLogs()
    const timeline = logs
      .filter(log => log.success)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    let content = `## Timeline Analysis

### Operation Sequence

`

    timeline.forEach((log, index) => {
      content += `${index + 1}. ${log.timestamp.toISOString()} - ${log.operation.toUpperCase()}`
      if (log.webhookId) content += ` webhook ${log.webhookId}`
      if (log.timingMs) content += ` (${log.timingMs}ms)`
      content += '\n'
    })

    return content
  }

  private extractKeyFindings(analysis: any): string[] {
    const findings: string[] = []

    if (analysis.summary.recyclingDetected) {
      findings.push('FileMaker recycles deleted webhook IDs')
      findings.push('ID assignment is unpredictable for external references')
    } else {
      findings.push('FileMaker assigns webhook IDs sequentially')
      findings.push('ID assignment is highly predictable')
    }

    if (analysis.patterns.sequential) {
      findings.push('Sequential pattern detected in ID assignment')
    }

    if (analysis.timing.averageCreateTime > 1000) {
      findings.push('Slow webhook creation times detected')
    }

    if (analysis.patterns.maxGapSize > 0) {
      findings.push(`Gaps detected in ID sequence (max gap: ${analysis.patterns.maxGapSize})`)
    }

    return findings
  }

  private extractRecommendations(analysis: any): string[] {
    return analysis.recommendations
  }

  exportMarkdown(): string {
    const doc = this.generateCompleteDocumentation()
    
    let content = `# ${doc.title}

Generated: ${doc.generatedAt}
Version: ${doc.version}

## Summary

${doc.summary.keyFindings.map(finding => `- ${finding}`).join('\n')}

## Recommendations

${doc.summary.recommendations.map(rec => `- ${rec}`).join('\n')}

---

`

    doc.sections.forEach(section => {
      content += `${section.content}\n\n---\n\n`
    })

    return content
  }

  exportJSON(): string {
    return JSON.stringify(this.generateCompleteDocumentation(), null, 2)
  }
}

export const documentationGenerator = new DocumentationGenerator()
