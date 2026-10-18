class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}

module.exports = {
    HttpError,
    badRequest: (message, details) => new HttpError(400, message, details),
    unauthorized: (message = 'Autenticação necessária.') => new HttpError(401, message),
    forbidden: (message = 'Você não tem permissão para esta ação.') => new HttpError(403, message),
    notFound: (message = 'Recurso não encontrado.') => new HttpError(404, message),
    conflict: (message) => new HttpError(409, message)
};
