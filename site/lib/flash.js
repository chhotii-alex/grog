module.exports = app => {   
    app.use((req, res, next) => {
        if (req.session.flash) {
            res.locals.flash = req.session.flash;
            delete req.session.flash;
        }
        next();
    })
}
