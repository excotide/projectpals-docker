import { BrowserRouter, Routes, Route } from "react-router-dom"
import AuthPage from "./pages/AuthPage"
import CreateRoom from "./pages/CreateRoom"

export default function App() {
  return; (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/create-room" element={<CreateRoom />} />
      </Routes>
    </BrowserRouter>
  )
}