import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import type { Database } from '@/types/filemaker'
import { Database as DatabaseIcon } from 'lucide-react'
import { TabsPanel } from './TabsPanel'

export function MainLayout() {
  const { isConnected, currentDatabase, setCurrentDatabase } = useFileMaker()
  const [databases, setDatabases] = useState<Database[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)

  useEffect(() => {
    if (isConnected) {
      loadDatabases()
    } else {
      setDatabases([])
      setCurrentDatabase(null)
    }
  }, [isConnected])

  const loadDatabases = async () => {
    setIsLoadingDatabases(true)
    try {
      const dbs = await fileMakerService.getDatabases()
      setDatabases(dbs)
    } catch (err) {
      console.error('Failed to load databases:', err)
    } finally {
      setIsLoadingDatabases(false)
    }
  }

  const handleDatabaseSelect = (database: Database) => {
    setCurrentDatabase(database)
  }

  return (
    <>
      {/* Left Sidebar - Databases List */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Databases</h2>
          {isLoadingDatabases ? (
            <p className="text-xs text-slate-500">Loading...</p>
          ) : databases.length === 0 ? (
            <p className="text-xs text-slate-500">No databases available</p>
          ) : (
            <div className="space-y-1">
              {databases.map((db) => (
                <button
                  key={db.name}
                  onClick={() => handleDatabaseSelect(db)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    currentDatabase?.name === db.name
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <DatabaseIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{db.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Tabs and Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isConnected && currentDatabase ? (
          <TabsPanel database={currentDatabase} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <DatabaseIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a database to get started</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
