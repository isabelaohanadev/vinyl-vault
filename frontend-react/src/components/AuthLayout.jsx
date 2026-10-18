export const AuthLayout = ({ children, footer }) => (
    <div className="auth-container">
        <div className="auth-box">
            <img src="/assets/logo.svg" alt="Vinyl Vault" className="auth-logo" />
            {children}
            {footer && <div className="auth-links">{footer}</div>}
        </div>
    </div>
);
