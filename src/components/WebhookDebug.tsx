import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Webhook } from '@/types/filemaker'

interface WebhookDebugProps {
  webhook: Webhook
}

export function WebhookDebug({ webhook }: WebhookDebugProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Debug Data
      </button>
      {isOpen && (
        <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-auto max-h-40 text-slate-700">
          {JSON.stringify(webhook, null, 2)}
        </pre>
      )}
    </div>
  )
}
