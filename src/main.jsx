import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 새 서비스 워커가 활성화되면 자동 리로드하여 최신 HTML 적용
let swRefreshing = false
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshing) return
    swRefreshing = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
