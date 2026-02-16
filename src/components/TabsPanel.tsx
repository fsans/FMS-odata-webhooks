import { useState, useEffect } from 'react'
import { fileMakerService } from '@/services/filemaker'
import type { Database, TableMetadata } from '@/types/filemaker'
import { Table, ChevronDown, ChevronRight, Plus, RefreshCw, Play, Trash2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WebhookDialog } from './WebhookDialog'
import WebhookIdResearchPanel from './WebhookIdResearchPanel'
import { PendingOperationsPanel } from './PendingOperationsPanel'
import { WebhookDebug } from './WebhookDebug'
import type { Webhook } from '@/types/filemaker'

interface TabsPanelProps {
  database: Database
}

export function TabsPanel({ database }: TabsPanelProps) {
  const [activeTab, setActiveTab] = useState<'tables' | 'webhooks' | 'research'>('tables')
  const [tables, setTables] = useState<TableMetadata[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | undefined>(undefined)

  useEffect(() => {
    if (activeTab === 'tables') {
      loadTables()
    } else if (activeTab === 'webhooks') {
      loadWebhooks()
    }
  }, [activeTab, database])

  const loadTables = async () => {
    setIsLoadingTables(true)
    setError(null)
    try {
      const metadata = await fileMakerService.getMetadata(database.name)
      setTables(metadata)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    } finally {
      setIsLoadingTables(false)
    }
  }

  const loadWebhooks = async () => {
    setIsLoadingWebhooks(true)
    setError(null)
    try {
      const data = await fileMakerService.getAllWebhooks(database.name)
      setWebhooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
    } finally {
      setIsLoadingWebhooks(false)
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      // Remove from local state immediately for better UX
      setWebhooks(prev => prev.filter(w => w.id !== webhookId))
      
      // Then delete from server
      await fileMakerService.deleteWebhook(database.name, webhookId)
      
      // Optional: Reload to ensure server state is in sync
      // loadWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook')
      // If deletion failed, reload the webhooks to restore the deleted item
      loadWebhooks()
    }
  }

  const handleInvokeWebhook = async (webhookId: string, tableName: string) => {
    try {
      await fileMakerService.invokeWebhook(database.name, webhookId, tableName)
      alert('Webhook invoked successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invoke webhook')
    }
  }

  const handleCreateWebhook = () => {
    setEditingWebhook(undefined)
    setIsDialogOpen(true)
  }

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setIsDialogOpen(true)
  }

  const handleDialogClose = (success: boolean, updateInfo?: { webhook: Webhook; oldId: string }) => {
    setIsDialogOpen(false)
    setEditingWebhook(undefined)
    if (success) {
      if (updateInfo) {
        // Handle webhook update: mark old webhook as deleted and add new one
        setWebhooks(prev => {
          const oldWebhook = prev.find(w => w.id === updateInfo.oldId)
          const otherWebhooks = prev.filter(w => w.id !== updateInfo.oldId)
          
          if (oldWebhook) {
            // Mark old webhook as deleted and add new webhook
            return [
              ...otherWebhooks,
              { ...oldWebhook, deleted: true },
              updateInfo.webhook
            ]
          }
          
          // Fallback: just add the new webhook
          return [...otherWebhooks, updateInfo.webhook]
        })
      } else {
        // Handle webhook creation: reload from server
        loadWebhooks()
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tables' | 'webhooks' | 'research')} className="flex flex-col h-full">
        <TabsList variant="line" className="px-6 py-0 rounded-none border-b border-slate-200 w-full justify-start">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="research">ID Research</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          <TabsContent value="tables" className="m-0 p-4">
            <h3 className="text-xs font-semibold text-slate-900 mb-2">
              Tables in {database.name}
            </h3>
            {isLoadingTables ? (
              <p className="text-xs text-slate-500">Loading tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-xs text-slate-500">No tables found</p>
            ) : (
              <div className="space-y-1">
                {tables.map((table) => (
                  <div key={table.name} className="border border-slate-200 rounded overflow-hidden">
                    <button
                      onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-900">
                        <Table className="h-3 w-3" />
                        {table.name}
                        <span className="text-xs text-slate-500 font-normal">
                          ({table.fields.length} fields)
                        </span>
                      </span>
                      {expandedTable === table.name ? (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      )}
                    </button>
                    {expandedTable === table.name && (
                      <div className="border-t border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="space-y-1">
                          {table.fields.map((field) => (
                            <div
                              key={field.name}
                              className="flex items-center justify-between text-xs py-0.5"
                            >
                              <span className="font-mono text-slate-700">{field.name}</span>
                              <span className="text-xs text-slate-500">
                                {field.type}
                                {field.calculation && ' (calc)'}
                                {field.global && ' (global)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhooks" className="m-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Webhook Manager
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={loadWebhooks}
                  disabled={isLoadingWebhooks}
                  className="p-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                  title="Refresh webhooks"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingWebhooks ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleCreateWebhook}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Webhook
                </button>
              </div>
            </div>

            {isLoadingWebhooks && webhooks.length === 0 ? (
              <p className="text-sm text-slate-500">Loading webhooks...</p>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No webhooks configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      webhook.deleted 
                        ? 'border-red-200 bg-red-50 opacity-60' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-sm ${webhook.deleted ? 'text-red-600 line-through' : 'text-slate-900'}`}>
                            {webhook.webhook}
                          </span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                            ID: {webhook.id}
                          </span>
                          {webhook.deleted && (
                            <span className="text-xs bg-red-100 px-2 py-1 rounded text-red-600">Deleted</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Database: {database.name} • Table: {webhook.tableName}
                          {webhook.select && ` • Fields: ${webhook.select}`}
                        </div>
                        {webhook.filter && (
                          <div className="text-xs text-slate-500">
                            Filter: {webhook.filter}
                          </div>
                        )}
                        {webhook.notifySchemaChanges && (
                          <div className="text-xs text-blue-600">
                            Schema change notifications enabled
                          </div>
                        )}
                        {webhook.headers && Object.keys(webhook.headers).length > 0 && (
                          <div className="text-xs text-slate-500">
                            Custom headers: {Object.keys(webhook.headers).join(', ')}
                          </div>
                        )}
                        <PendingOperationsPanel operations={webhook.pendingOperations || []} />
                        <WebhookDebug webhook={webhook} />
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleInvokeWebhook(webhook.id, webhook.tableName)}
                          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Test webhook"
                          disabled={webhook.deleted}
                        >
                          <Play className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleEditWebhook(webhook)}
                          className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={webhook.deleted}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          className="p-1.5 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete webhook"
                          disabled={webhook.deleted}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="research" className="m-0 p-0">
            <WebhookIdResearchPanel />
          </TabsContent>
        </div>
      </Tabs>

      <WebhookDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        webhook={editingWebhook}
      />
    </div>
  )
}
