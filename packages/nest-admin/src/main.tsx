import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './app.css'
import './i18n'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient.ts'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { initTheme } from './lib/theme'

initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <App />
        <Toaster position="top-right" toastOptions={{ className: 'app-toast' }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
