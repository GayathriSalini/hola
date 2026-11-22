import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Home from './pages/Home'
import History from './pages/History'
import VideoMeet from './pages/VideoMeet'
import { getToken } from './api'

function Protected({ children }) {
  return getToken() ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/home" element={<Protected><Home /></Protected>} />
      <Route path="/history" element={<Protected><History /></Protected>} />
      <Route path="/meet/:code" element={<VideoMeet />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
