module.exports = app => {
    app.use((req, res) => {
        res.status(404)
        res.format({
            'application/json': () => {
                res.json({})
            },
            'application/xml': () => {
                // TODO
            },
            'text/plain': () => {
                res.send('404 - Not Found')
            },
            'text/html': () => {
                res.render('404')
            }
        })
    })

    app.errorHandler = (err, req, res) => {
        console.log("Doing 500 handler")
        console.error(err.message)
        res.status(500)
        res.format({
            'application/json': () => {
                res.json({})
            },
            'application/xml': () => {
                res.send("")
            },
            'text/plain': () => {
                res.send('500 - Server Error')
            },
            'text/html': () => {
                res.render('500')
            }
        })
    }
    
    app.use((err, req, res, next) => {
        app.errorHandler(err, req, res)
    })
}