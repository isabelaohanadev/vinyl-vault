import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

export const AddVinylModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        nome: '',
        artista: '',
        ano: '',
        genero: '',
        foto: '',
        estado_capa: 'M',
        estado_disco: 'M',
        negociavel: false
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            await axios.post('http://localhost:3000/api/vinis', {
                ...formData,
                usuario_id: user.id
            });
            
            setFormData({
                nome: '', artista: '', ano: '', genero: '', foto: '',
                estado_capa: 'M', estado_disco: 'M', negociavel: false
            });
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar o vinil. Verifique os dados.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">Adicionar ao Acervo</h2>
                    <button onClick={onClose} className="btn-close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="input-group full-width">
                        <label className="input-label">Nome do Álbum</label>
                        <input 
                            type="text" 
                            name="nome" 
                            value={formData.nome} 
                            onChange={handleChange} 
                            className="input-field" 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Artista / Banda</label>
                        <input 
                            type="text" 
                            name="artista" 
                            value={formData.artista} 
                            onChange={handleChange} 
                            className="input-field" 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Ano de Lançamento</label>
                        <input 
                            type="number" 
                            name="ano" 
                            value={formData.ano} 
                            onChange={handleChange} 
                            className="input-field" 
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Gênero Musical</label>
                        <input 
                            type="text" 
                            name="genero" 
                            value={formData.genero} 
                            onChange={handleChange} 
                            className="input-field" 
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">URL da Capa (Imagem)</label>
                        <input 
                            type="text" 
                            name="foto" 
                            value={formData.foto} 
                            onChange={handleChange} 
                            className="input-field" 
                            placeholder="https://..." 
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Estado da Capa</label>
                        <select name="estado_capa" value={formData.estado_capa} onChange={handleChange} className="input-field">
                            <option value="M">Mint (M)</option>
                            <option value="NM">Near Mint (NM)</option>
                            <option value="VG+">Very Good Plus (VG+)</option>
                            <option value="VG">Very Good (VG)</option>
                            <option value="G">Good (G)</option>
                            <option value="P">Poor (P)</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Estado do Disco</label>
                        <select name="estado_disco" value={formData.estado_disco} onChange={handleChange} className="input-field">
                            <option value="M">Mint (M)</option>
                            <option value="NM">Near Mint (NM)</option>
                            <option value="VG+">Very Good Plus (VG+)</option>
                            <option value="VG">Very Good (VG)</option>
                            <option value="G">Good (G)</option>
                            <option value="P">Poor (P)</option>
                        </select>
                    </div>

                    <div className="input-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <input 
                            type="checkbox" 
                            name="negociavel" 
                            checked={formData.negociavel} 
                            onChange={handleChange} 
                            id="negociavel-check" 
                            style={{ width: '18px', height: '18px' }} 
                        />
                        <label htmlFor="negociavel-check" className="input-label" style={{ cursor: 'pointer' }}>
                            Disponível para troca/venda
                        </label>
                    </div>

                    <div className="full-width">
                        <button type="submit" className="btn-submit">Salvar Vinil</button>
                    </div>
                </form>
            </div>
        </div>
    );
};