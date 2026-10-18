import { keyboardActivate } from '../lib/a11y';
import { CoverImage } from './CoverImage';

export const VinylCard = ({ vinil, onClick }) => (
    <div
        className="vinyl-card"
        role="button"
        tabIndex={0}
        aria-label={`${vinil.nome}, de ${vinil.artista}`}
        onClick={onClick}
        onKeyDown={keyboardActivate(onClick)}
    >
        {vinil.negociavel && <span className="vinyl-tag vinyl-tag-trade">Troca</span>}
        {!vinil.adquirido && <span className="vinyl-tag vinyl-tag-wish">Quero</span>}
        <CoverImage src={vinil.foto} alt="" className="vinyl-cover" />
        <div className="vinyl-info">
            <h3 className="vinyl-title">{vinil.nome}</h3>
            <p className="vinyl-artist">{vinil.artista}</p>
        </div>
    </div>
);
