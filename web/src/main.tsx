import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CatalogProvider } from '@/content/CatalogContext'
import App from '@/ui/App'
import './index.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CatalogProvider>
      <App />
    </CatalogProvider>
  </StrictMode>,
)
