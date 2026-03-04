import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import './styles/index.js';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Community from './pages/Community';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
                    
                    <Route path="/login" element={<Login />} />
                    
                    <Route 
                        path="/dashboard" 
                        element={
                            <PrivateRoute>
                                <Dashboard />
                            </PrivateRoute>
                        } 
                    />

                    <Route 
                        path="/market" 
                        element={
                            <PrivateRoute>
                                <Market />
                            </PrivateRoute>
                        } 
                    />

                    <Route 
                        path="/community" 
                        element={
                            <PrivateRoute>
                                <Community />
                            </PrivateRoute>
                        } 
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;