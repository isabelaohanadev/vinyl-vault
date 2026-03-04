import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Player } from './Player';

export const Layout = ({ children }) => {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                <Topbar />
                {children}
            </main>
            <Player />
        </div>
    );
};