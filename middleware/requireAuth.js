// Route guard: redirects to /login if there's no logged-in user in the
// session, otherwise lets the request continue to the protected route.
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

module.exports = requireAuth;
