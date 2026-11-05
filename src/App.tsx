import { Link, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'

function NotFoundPage() {
  return <main className="room-shell"><section className="room-state"><h1>Trang này chưa có</h1><Link className="text-link" to="/">Về trang đầu</Link></section></main>
}

export default function App() {
  return <Routes><Route path="/" element={<HomePage />} /><Route path="/rooms/:roomId" element={<RoomPage />} /><Route path="*" element={<NotFoundPage />} /></Routes>
}
