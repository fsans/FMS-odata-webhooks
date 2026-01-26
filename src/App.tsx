import { useState } from 'react'
import { FileMakerProvider } from './contexts/FileMakerContext'
import { ConnectionForm } from './components/ConnectionForm'
import { MainLayout } from './components/MainLayout'
import { HeaderContent } from './components/HeaderContent'

function App() {
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  return (
    <FileMakerProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-slate-200">
          <HeaderContent onOpenConnection={() => setShowConnectionModal(true)} />
        </header>

        <main className="flex h-[calc(100vh-80px)]">
          <MainLayout />
        </main>

        {showConnectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Connect to FileMaker Server</h2>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <ConnectionForm onClose={() => setShowConnectionModal(false)} />
            </div>
          </div>
        )}
      </div>
    </FileMakerProvider>
  )
}

export default App
