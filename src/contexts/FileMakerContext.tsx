import { createContext, useContext, useState, ReactNode } from 'react'
import type { FileMakerConnection, Database, TableMetadata } from '@/types/filemaker'
import { fileMakerService } from '@/services/filemaker'

interface FileMakerContextType {
  connection: FileMakerConnection | null
  isConnected: boolean
  currentDatabase: Database | null
  currentTable: TableMetadata | null
  setConnection: (connection: FileMakerConnection) => void
  disconnect: () => void
  setCurrentDatabase: (database: Database | null) => void
  setCurrentTable: (table: TableMetadata | null) => void
}

const FileMakerContext = createContext<FileMakerContextType | undefined>(undefined)

export function FileMakerProvider({ children }: { children: ReactNode }) {
  const [connection, setConnectionState] = useState<FileMakerConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentDatabase, setCurrentDatabase] = useState<Database | null>(null)
  const [currentTable, setCurrentTable] = useState<TableMetadata | null>(null)

  const setConnection = (newConnection: FileMakerConnection) => {
    setConnectionState(newConnection)
    fileMakerService.setConnection(newConnection)
    setIsConnected(true)
  }

  const disconnect = () => {
    setConnectionState(null)
    setIsConnected(false)
    setCurrentDatabase(null)
    setCurrentTable(null)
  }

  return (
    <FileMakerContext.Provider
      value={{
        connection,
        isConnected,
        currentDatabase,
        currentTable,
        setConnection,
        disconnect,
        setCurrentDatabase,
        setCurrentTable,
      }}
    >
      {children}
    </FileMakerContext.Provider>
  )
}

export function useFileMaker() {
  const context = useContext(FileMakerContext)
  if (context === undefined) {
    throw new Error('useFileMaker must be used within a FileMakerProvider')
  }
  return context
}
