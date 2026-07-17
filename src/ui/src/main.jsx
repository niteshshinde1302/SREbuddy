import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import EmptyState from './components/EmptyState.jsx'
import ChatView from './components/ChatView.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<EmptyState />} />
          <Route path="chat/:sessionId" element={<ChatView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
