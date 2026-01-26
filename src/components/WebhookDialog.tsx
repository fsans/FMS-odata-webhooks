import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { Webhook, TableMetadata } from '@/types/filemaker'

interface WebhookDialogProps {
  open: boolean
  onClose: (success: boolean) => void
  webhook?: Webhook
}

export function WebhookDialog({ open, onClose, webhook }: WebhookDialogProps) {
  const { currentDatabase } = useFileMaker()
  const [tables, setTables] = useState<TableMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [webhookUrl, setWebhookUrl] = useState('')
  const [tableName, setTableName] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [notifySchemaChanges, setNotifySchemaChanges] = useState(false)
  const [customHeaders, setCustomHeaders] = useState('')

  useEffect(() => {
    if (open && currentDatabase) {
      loadTables()
      if (webhook) {
        setWebhookUrl(webhook.webhook)
        setTableName(webhook.tableName)
        setSelectedFields(webhook.select ? webhook.select.split(',') : [])
        setFilter(webhook.filter || '')
        setNotifySchemaChanges(webhook.notifySchemaChanges)
        setCustomHeaders(webhook.headers ? JSON.stringify(webhook.headers, null, 2) : '')
      } else {
        resetForm()
      }
    }
  }, [open, webhook, currentDatabase])

  const loadTables = async () => {
    if (!currentDatabase) return
    try {
      const metadata = await fileMakerService.getMetadata(currentDatabase.name)
      setTables(metadata)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    }
  }

  const resetForm = () => {
    setWebhookUrl('')
    setTableName('')
    setSelectedFields([])
    setFilter('')
    setNotifySchemaChanges(false)
    setCustomHeaders('')
    setError(null)
  }

  const handleFieldToggle = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentDatabase) return

    setIsLoading(true)
    setError(null)

    try {
      let headers: Record<string, string> | undefined
      if (customHeaders.trim()) {
        try {
          headers = JSON.parse(customHeaders)
        } catch {
          throw new Error('Invalid JSON in custom headers')
        }
      }

      const params = {
        webhook: webhookUrl,
        tableName,
        select: selectedFields.length > 0 ? selectedFields.join(',') : undefined,
        filter: filter.trim() || undefined,
        notifySchemaChanges,
        headers,
      }

      if (webhook) {
        // Update existing webhook
        await fileMakerService.updateWebhook(currentDatabase.name, webhook.id, params)
      } else {
        // Create new webhook
        await fileMakerService.createWebhook(currentDatabase.name, params)
      }

      onClose(true)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTable = tables.find((t) => t.name === tableName)

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{webhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
            <DialogDescription>
              Configure webhook for {currentDatabase?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL *</Label>
              <Input
                id="webhook-url"
                placeholder="https://example.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                Where FileMaker Server will send HTTP POST notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-name">Table *</Label>
              <select
                id="table-name"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value)
                  setSelectedFields([])
                }}
                required
              >
                <option value="">Select a table</option>
                {tables.map((table) => (
                  <option key={table.name} value={table.name}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>

            {currentTable && (
              <div className="space-y-2">
                <Label>Select Fields (optional)</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {currentTable.fields.map((field) => (
                    <label
                      key={field.name}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <Checkbox
                        checked={selectedFields.includes(field.name)}
                        onChange={() => handleFieldToggle(field.name)}
                      />
                      <span className="text-sm">{field.name}</span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {field.type}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Leave empty to include all fields
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="filter">OData Filter (optional)</Label>
              <Input
                id="filter"
                placeholder="Field1 eq 'value'"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                OData v4 filter expression (e.g., "Status eq 'Active'")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headers">Custom Headers (optional JSON)</Label>
              <Textarea
                id="headers"
                placeholder='{"Authorization": "Bearer token123"}'
                value={customHeaders}
                onChange={(e) => setCustomHeaders(e.target.value)}
                rows={3}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={notifySchemaChanges}
                onChange={(e) => setNotifySchemaChanges((e.target as HTMLInputElement).checked)}
              />
              <span className="text-sm">Notify on schema changes</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : webhook ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
