import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import type { Database } from '@/types/filemaker'
import { Database as DatabaseIcon, Search, X } from 'lucide-react'
import { TabsPanel } from './TabsPanel'

export function MainLayout() {
  const { isConnected, currentDatabase, setCurrentDatabase } = useFileMaker()
  const [databases, setDatabases] = useState<Database[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Left Sidebar - Databases List */}
      <div className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto flex flex-col">
        <div className="p-2 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xs font-semibold text-slate-900 mb-2">Databases</h2>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-6 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {isLoadingDatabases ? (
            <p className="text-xs text-slate-500">Loading...</p>
          ) : filteredDatabases.length === 0 ? (
            <p className="text-xs text-slate-500">
              {databases.length === 0 ? 'No databases available' : 'No databases match your search'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredDatabases.map((db) => (
                <button
                  key={db.name}
                  onClick={() => handleDatabaseSelect(db)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    currentDatabase?.name === db.name
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <DatabaseIcon className="h-3 w-3 flex-shrink-0" />
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
