import { FileMakerProvider } from './contexts/FileMakerContext'
import { MainLayout } from './components/MainLayout'
import { HeaderContent } from './components/HeaderContent'

function App() {
  return (
    <FileMakerProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <HeaderContent />
        </header>

        <main className="flex flex-1 h-[calc(100vh-80px-40px)]">
          <MainLayout />
        </main>

        <footer className="h-[40px] bg-white border-t border-slate-200 flex items-center justify-between px-6">
          <div className="text-xs text-slate-600">
            <span>FileMaker OData Webhooks Manager v1.0.2</span>
            <span className="mx-2">•</span>
            <span>Copyright © nBCN Software 2026 Barcelona</span>
          </div>
          <div className="text-xs text-slate-600 space-x-4">
            <a href="https://www.ntwk.es" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">
              www.ntwk.es
            </a>
            <span className="mx-2">•</span>
            <a href="mailto:tecnic@ntwk.es" className="hover:text-slate-900 transition-colors">
              tecnic@ntwk.es
            </a>
          </div>
        </footer>
      </div>
    </FileMakerProvider>
  )
}

export default App
