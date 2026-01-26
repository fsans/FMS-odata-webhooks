import { useFileMaker } from '@/contexts/FileMakerContext'

interface HeaderContentProps {
  onOpenConnection: () => void
}

export function HeaderContent({ onOpenConnection }: HeaderContentProps) {
  const { isConnected, connection, disconnect } = useFileMaker()

  const handleConnectionClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      onOpenConnection()
    }
  }

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          FileMaker OData Webhooks Manager
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Manage FileMaker Server webhooks via OData API
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Database host:</label>
          <input
            type="text"
            value={connection?.host || ''}
            placeholder="https://192.168.0.24"
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        </div>
        <button
          onClick={handleConnectionClick}
          className={`px-4 py-1.5 text-white text-sm font-medium rounded-md transition-colors ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isConnected ? 'disconnect' : 'connect'}
        </button>
      </div>
    </div>
  )
}
