export const VinylCard = ({ vinil, onClick }) => {
    return (
        <div className="vinyl-card" onClick={onClick}>
            <img 
                src={vinil.foto || '/assets/default-cover.jpg'} 
                alt={vinil.nome} 
                className="vinyl-cover" 
            />
            <div className="vinyl-info">
                <h3 className="vinyl-title">{vinil.nome}</h3>
                <p className="vinyl-artist">{vinil.artista}</p>
            </div>
        </div>
    );
};