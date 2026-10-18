import { useId } from 'react';

// Label + input for the auth forms; keeps the markup accessible without repeating it.
export const FormField = ({ label, hint, className = 'auth-input', ...inputProps }) => {
    const id = useId();

    return (
        <div className="form-field">
            <label htmlFor={id} className="form-field-label">
                {label}
            </label>
            <input id={id} className={className} aria-describedby={hint ? `${id}-hint` : undefined} {...inputProps} />
            {hint && (
                <small id={`${id}-hint`} className="form-field-hint">
                    {hint}
                </small>
            )}
        </div>
    );
};
