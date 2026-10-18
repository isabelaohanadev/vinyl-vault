import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { PlayerProvider } from './contexts/PlayerProvider';
import { useAuth } from './hooks/useAuth';
import { PrivateRoute } from './components/PrivateRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import './styles/index.js';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Market from './pages/Market';
import Community from './pages/Community';
import Profile from './pages/Profile';

// Remounted when the user changes (login/logout), which stops playback and clears the queue,
// so a new session never inherits the previous user's audio.
const SessionPlayer = ({ children }) => {
    const { user } = useAuth();

    return <PlayerProvider key={user?.id ?? 'guest'}>{children}</PlayerProvider>;
};

const priv = (page) => <PrivateRoute>{page}</PrivateRoute>;
const publicOnly = (page) => <PublicOnlyRoute>{page}</PublicOnlyRoute>;

export default function App() {
    return (
        <AuthProvider>
            <SessionPlayer>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />

                        <Route path="/login" element={publicOnly(<Login />)} />
                        <Route path="/register" element={publicOnly(<Register />)} />
                        <Route path="/forgot-password" element={publicOnly(<ForgotPassword />)} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route path="/dashboard" element={priv(<Dashboard />)} />
                        <Route path="/feed" element={priv(<Feed />)} />
                        <Route path="/market" element={priv(<Market />)} />
                        <Route path="/community" element={priv(<Community />)} />
                        <Route path="/profile" element={priv(<Profile />)} />
                        <Route path="/users/:id" element={priv(<Profile />)} />

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </SessionPlayer>
        </AuthProvider>
    );
}
