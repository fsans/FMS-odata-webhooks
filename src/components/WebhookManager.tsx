import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WebhookDialog } from './WebhookDialog'
import type { Webhook } from '@/types/filemaker'
import { Webhook as WebhookIcon, Plus, Trash2, Play, RefreshCw } from 'lucide-react'

export function WebhookManager() {
  const { isConnected, currentDatabase } = useFileMaker()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | undefined>(undefined)

  useEffect(() => {
    if (isConnected && currentDatabase) {
      loadWebhooks()
    } else {
      setWebhooks([])
    }
  }, [isConnected, currentDatabase])

  const loadWebhooks = async () => {
    if (!currentDatabase) return

    setIsLoading(true)
    setError(null)
    try {
      const data = await fileMakerService.getAllWebhooks(currentDatabase.name)
      setWebhooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (webhookId: string) => {
    if (!currentDatabase) return
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      await fileMakerService.deleteWebhook(currentDatabase.name, webhookId)
      await loadWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook')
    }
  }

  const handleInvoke = async (webhookId: string) => {
    if (!currentDatabase) return

    try {
      await fileMakerService.invokeWebhook(currentDatabase.name, webhookId)
      alert('Webhook invoked successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invoke webhook')
    }
  }

  const handleCreate = () => {
    setEditingWebhook(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setIsDialogOpen(true)
  }

  const handleDialogClose = (success: boolean) => {
    setIsDialogOpen(false)
    setEditingWebhook(undefined)
    if (success) {
      loadWebhooks()
    }
  }

  if (!isConnected || !currentDatabase) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WebhookIcon className="h-5 w-5" />
              Webhook Manager
            </CardTitle>
            <CardDescription>
              Manage webhooks for {currentDatabase.name}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadWebhooks}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Webhook
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {isLoading && webhooks.length === 0 ? (
          <p className="text-sm text-slate-500">Loading webhooks...</p>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <WebhookIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No webhooks configured</p>
            <p className="text-sm">Create your first webhook to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="border rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{webhook.webhook}</div>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">ID: {webhook.id}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Database: {currentDatabase?.name} • Table: {webhook.tableName}
                        {webhook.select && ` • Fields: ${webhook.select}`}
                      </div>
                      {webhook.filter && (
                        <div className="text-xs text-slate-500 mt-1">
                          Filter: {webhook.filter}
                        </div>
                      )}
                      {webhook.notifySchemaChanges && (
                        <div className="text-xs text-blue-600 mt-1">
                          Schema change notifications enabled
                        </div>
                      )}
                      {webhook.headers && Object.keys(webhook.headers).length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          Custom headers: {Object.keys(webhook.headers).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvoke(webhook.id)}
                      title="Test webhook"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(webhook)}
                      title="Edit webhook"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      title="Delete webhook"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <WebhookDialog
          open={isDialogOpen}
          onClose={handleDialogClose}
          webhook={editingWebhook}
        />
      </CardContent>
    </Card>
  )
}
