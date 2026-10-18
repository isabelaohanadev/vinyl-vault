// Makes a non-button element (a clickable card) usable from the keyboard.
export const keyboardActivate = (handler) => (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler(event);
    }
};
