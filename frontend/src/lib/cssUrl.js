// Builds a safe CSS url("...") value for a user-supplied image address, so quotes,
// parentheses or whitespace cannot break out of the declaration.
export const cssUrl = (address) => `url("${String(address).replace(/["'()\\\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}")`;
