import { useEffect, useId, useRef } from 'react';

export const Modal = ({ title, onClose, children, maxWidth }) => {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        dialogRef.current?.focus();
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onCloseRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    return (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div
                ref={dialogRef}
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                style={maxWidth ? { maxWidth } : undefined}
            >
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">
                        {title}
                    </h2>
                    <button type="button" onClick={onClose} className="btn-close" aria-label="Fechar">
                        <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};
