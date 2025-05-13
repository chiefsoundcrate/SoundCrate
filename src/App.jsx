// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Carousel from "./components/Carousel";

import Footer from "./components/Footer";
import { AuthProvider } from "./hooks/useAuth";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Import worker with Vite-compatible URL syntax
const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});

function Layout() {
  useEffect(() => {
    // Send data to the worker
    worker.postMessage(5);

    // Receive data from the worker
    worker.onmessage = (e) => {
      console.log("Result from worker:", e.data); // should log: 10
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D0D] text-white flex flex-col">
      <Navbar />
      <Hero />
      <Carousel />
      <Footer />
      <Outlet />
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
