export const FullScreenLoader = ({ message = 'Carregando o cofre...' }) => (
    <div className="fullscreen-loader" role="status" aria-live="polite">
        <h2>{message}</h2>
    </div>
);
