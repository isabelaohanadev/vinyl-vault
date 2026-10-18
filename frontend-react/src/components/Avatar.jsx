import { useState } from 'react';

// Profile picture with the user's initial as a fallback (no photo, or a broken link).
export const Avatar = ({ src, name = '', className }) => {
    const [failedSrc, setFailedSrc] = useState(null);

    if (src && src !== failedSrc) {
        return <img src={src} alt="" className={className} onError={() => setFailedSrc(src)} />;
    }

    return (
        <div className={className} aria-hidden="true">
            {name.charAt(0).toUpperCase() || '?'}
        </div>
    );
};
