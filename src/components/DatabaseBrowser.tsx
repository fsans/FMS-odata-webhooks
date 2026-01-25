import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Database, TableMetadata } from '@/types/filemaker'
import { Database as DatabaseIcon, Table, ChevronDown, ChevronRight } from 'lucide-react'

export function DatabaseBrowser() {
  const { isConnected, currentDatabase, setCurrentDatabase, setCurrentTable } = useFileMaker()
  const [databases, setDatabases] = useState<Database[]>([])
  const [tables, setTables] = useState<TableMetadata[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTable, setExpandedTable] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadDatabases()
    } else {
      setDatabases([])
      setTables([])
      setCurrentDatabase(null)
      setCurrentTable(null)
    }
  }, [isConnected])

  const loadDatabases = async () => {
    setIsLoadingDatabases(true)
    setError(null)
    try {
      const dbs = await fileMakerService.getDatabases()
      setDatabases(dbs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases')
    } finally {
      setIsLoadingDatabases(false)
    }
  }

  const handleDatabaseSelect = async (database: Database) => {
    setCurrentDatabase(database)
    setCurrentTable(null)
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

  const handleTableSelect = (table: TableMetadata) => {
    setCurrentTable(table)
    setExpandedTable(expandedTable === table.name ? null : table.name)
  }

  if (!isConnected) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="h-5 w-5" />
          Database Browser
        </CardTitle>
        <CardDescription>
          Select a database and table to view schema and manage webhooks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium mb-2">Databases</h3>
          {isLoadingDatabases ? (
            <p className="text-sm text-slate-500">Loading databases...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {databases.map((db) => (
                <Button
                  key={db.name}
                  variant={currentDatabase?.name === db.name ? 'default' : 'outline'}
                  onClick={() => handleDatabaseSelect(db)}
                  className="justify-start"
                >
                  <DatabaseIcon className="h-4 w-4 mr-2" />
                  {db.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {currentDatabase && (
          <div>
            <h3 className="text-sm font-medium mb-2">
              Tables in {currentDatabase.name}
            </h3>
            {isLoadingTables ? (
              <p className="text-sm text-slate-500">Loading tables...</p>
            ) : (
              <div className="space-y-2">
                {tables.map((table) => (
                  <div key={table.name} className="border rounded-lg">
                    <Button
                      variant="ghost"
                      onClick={() => handleTableSelect(table)}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        {table.name}
                        <span className="text-xs text-slate-500">
                          ({table.fields.length} fields)
                        </span>
                      </span>
                      {expandedTable === table.name ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    {expandedTable === table.name && (
                      <div className="px-4 pb-4 space-y-1">
                        {table.fields.map((field) => (
                          <div
                            key={field.name}
                            className="text-sm flex justify-between items-center py-1"
                          >
                            <span className="font-mono">{field.name}</span>
                            <span className="text-slate-500 text-xs">
                              {field.type}
                              {field.calculation && ' (calc)'}
                              {field.global && ' (global)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
