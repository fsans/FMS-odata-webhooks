import { FileMakerProvider } from './contexts/FileMakerContext'
import { ConnectionForm } from './components/ConnectionForm'
import { DatabaseBrowser } from './components/DatabaseBrowser'
import { WebhookManager } from './components/WebhookManager'

function App() {
  return (
    <FileMakerProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-slate-900">
              FileMaker OData Webhooks Manager
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage FileMaker Server webhooks via OData API
            </p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <ConnectionForm />
            <DatabaseBrowser />
            <WebhookManager />
          </div>
        </main>
      </div>
    </FileMakerProvider>
  )
}

export default App
