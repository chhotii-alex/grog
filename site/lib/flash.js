/* Middleware to always add the data from the session's flash object to the rendering
context, so that flash messages will get interpolated into the handlebar templates upon
rendering.
*/

module.exports = app => {   
    app.use((req, res, next) => {
        if (req.session.flash) {
            res.locals.flash = req.session.flash;
            delete req.session.flash;
        }
        next();
    })
}
