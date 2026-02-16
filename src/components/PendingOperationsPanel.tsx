import { AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'
import type { PendingOperation } from '@/types/filemaker'

interface PendingOperationsPanelProps {
  operations: PendingOperation[]
}

function getOperationIcon(operation: PendingOperation) {
  if (operation.lastErrorCode !== 0) {
    return <AlertCircle className="h-4 w-4 text-red-600" />
  }
  if (operation.status === 'SENT') {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />
  }
  return <Clock className="h-4 w-4 text-amber-600" />
}

function getStatusColor(operation: PendingOperation) {
  if (operation.lastErrorCode !== 0) {
    return 'bg-red-50 border-red-200'
  }
  if (operation.status === 'SENT') {
    return 'bg-green-50 border-green-200'
  }
  return 'bg-amber-50 border-amber-200'
}

function getStatusText(operation: PendingOperation) {
  if (operation.lastErrorCode !== 0) {
    return `Error (Code: ${operation.lastErrorCode})`
  }
  return operation.status
}

export function PendingOperationsPanel({ operations }: PendingOperationsPanelProps) {
  if (!operations || operations.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-2 border-t pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-semibold text-slate-700">Pending Operations ({operations.length})</span>
      </div>
      
      <div className="space-y-2">
        {operations.map((op, idx) => (
          <div
            key={idx}
            className={`border rounded p-2 text-xs ${getStatusColor(op)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                {getOperationIcon(op)}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {op.operation}
                  </div>
                  <div className="text-slate-600 mt-1">
                    Row IDs: {op.rowIDs.join(', ')}
                  </div>
                  <div className="text-slate-600">
                    Status: <span className="font-semibold">{getStatusText(op)}</span>
                  </div>
                  {op.sendAttempts > 0 && (
                    <div className="text-slate-600">
                      Send Attempts: {op.sendAttempts}
                    </div>
                  )}
                  {op.lastErrorMessage && (
                    <div className="text-red-700 mt-1 font-mono text-xs bg-red-100 p-1 rounded">
                      {op.lastErrorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
