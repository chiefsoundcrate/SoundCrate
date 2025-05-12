// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Carousel from "./components/Carousel";
import Leaderboard from "./components/Leaderboard";
import Footer from "./components/Footer";
import { AuthProvider } from "./hooks/useAuth";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function Layout() {
  return (
    <div className="min-h-screen bg-[#0B0D0D] text-white flex flex-col">
      <Navbar />
      <Hero />
      <Carousel />
      
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="profile" element={<Profile />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            {/* Add more routes as needed */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;