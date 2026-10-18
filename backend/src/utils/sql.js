// Escapes LIKE wildcards so user input is matched literally ("100%" must not match everything).
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const likeContains = (value) => `%${escapeLike(value)}%`;

module.exports = { escapeLike, likeContains };
