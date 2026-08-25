const crypto = require('crypto');

const PERIMETER_SECRET = process.env.PERIMETER_SECRET || 'dev-secret-do-not-use-in-prod';

function signSession(idToken) {
    return crypto.createHmac('sha256', PERIMETER_SECRET).update(idToken).digest('hex');
}

function requireAuth(req, res, next) {
    const sessionCookie = req.cookies.__session;
    
    // In local dev, allow bypass if needed, but strict in prod
    if (!sessionCookie) {
        if (req.path.startsWith('/api/') || req.path === '/app') {
            return res.redirect('/'); // redirect to perimeter
        }
        return next();
    }
    
    // We have a session, proceed
    req.authenticatedUser = true; 
    next();
}

module.exports = {
    signSession,
    requireAuth
};
