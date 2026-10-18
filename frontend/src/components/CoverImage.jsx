import { useState } from 'react';

export const DEFAULT_COVER = '/assets/default-cover.svg';

// Album art that falls back to the default cover when missing or broken.
export const CoverImage = ({ src, alt, ...props }) => {
    const [failedSrc, setFailedSrc] = useState(null);
    const effective = src && src !== failedSrc ? src : DEFAULT_COVER;

    return <img src={effective} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} {...props} />;
};
