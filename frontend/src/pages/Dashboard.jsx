import { Layout } from '../components/Layout';

export default function Dashboard() {
    return (
        <Layout>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Meu Acervo</h1>
                <button className="btn-edit-profile" style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-light)' }}>
                    + Adicionar Vinil
                </button>
            </div>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Vinis na Coleção</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Disponíveis para Troca</span>
                </div>
            </div>

            <div className="vinyl-grid" style={{ marginTop: '40px' }}>
                
            </div>
        </Layout>
    );
}