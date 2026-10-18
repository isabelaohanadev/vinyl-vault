import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { PrivateRoute } from './components/PrivateRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import './styles/index.js';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Community from './pages/Community';
import Profile from './pages/Profile';

const priv = (page) => <PrivateRoute>{page}</PrivateRoute>;
const publicOnly = (page) => <PublicOnlyRoute>{page}</PublicOnlyRoute>;

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    <Route path="/login" element={publicOnly(<Login />)} />

                    <Route path="/dashboard" element={priv(<Dashboard />)} />
                    <Route path="/market" element={priv(<Market />)} />
                    <Route path="/community" element={priv(<Community />)} />
                    <Route path="/profile" element={priv(<Profile />)} />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
