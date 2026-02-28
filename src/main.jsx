import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import AppQueryClientProvider from './providers/AppQueryClientProvider'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <AppQueryClientProvider>
        <App />
    </AppQueryClientProvider>
) 