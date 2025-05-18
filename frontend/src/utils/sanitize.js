export const sanitizeInput = (str) => {
    return str.replace(/[<>"'`;]/g, '');
};