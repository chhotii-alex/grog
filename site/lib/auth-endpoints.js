const database = require('../database')

// Endpoints dealing with user authentication, both getting 
// and checking for user authentication. 
// These routes should be added before all other others, so that we check for
// authentication before exposing any other functionality.
// This module exposes a function, which takes the express app as a parameter
// and adds routes to it. See Brown p. 181. I like this pattern, where the
// route and the function handling the endpoint's functionality appear together,
// in contrast to using named functions. I find that if the routing looks like
// this: app.get('/funpage', doTheFunPage) with the function doTheFunPage elsewhere
// in the code, then I have to keep flipping back and forth between the routing and the
// function to check: is this called from a GET or a POST or some other method? Will
// I find the paramters in req.body or req.params or req.query?
module.exports = app => {
    app.get('/', (req, res) => {
        if (req.session.userName) {
            res.redirect(303, '/landing')
        }
        else {
            res.redirect(303, '/login')
        }
    })
    
    app.get('/about', (req, res) => {
        res.render('about')
    })
    
    app.get('/login', (req, res) => {
        res.render('login')
    })

    app.post('/login', async (req, res) => {
        // Since this is a POST, the submitted values are in the POST body.
        let {user, pwd } = req.body
        try {
            let isValid = await database.validateLogin(user, pwd)
            if (isValid) {
                req.session.userName = user
                res.redirect(303, '/landing')
            }
            else {
                req.session.flash = {
                    type:'danger',
                    intro:'Login Error',
                    message:'Unknown account or incorrect password'
                }
                res.redirect(303, '/login')
            }
        }
        catch(error) {
            app.errorHandler(error, req, res)
        }
    })
    app.post('/logout', (req, res) => {
        req.session.userName = null
        res.redirect(303, '/login')
    })

    app.get('/newuser', (req, res) => {
        res.render('newuser')
    })
    let accountNamePattern = /^\w+$/
    app.post('/newuser', async (req, res) => {
        let {user, pwd1, pwd2, name} = req.body
        if (pwd1 != pwd2) {
            // flash message telling user that passwords have to match
            // And also piggyback onto the flash mechanism to pre-populate form
            req.session.flash = {
                type:'danger',
                intro:'Password Error',
                message:'Passwords do not match',
                name:name,
                user:user,
            }
            // Return user to same form so they can try again
            return res.redirect(303, '/newuser')
        }
        if (!accountNamePattern.test(user)) {
            // Bad characters (spaces, punct, etc) in requested account name
            // Somehow got past the client-side validation-- should not happen
            // unless someone is trying to hack.
            console.log("Bad suggested account name: " + user)
            return res.redirect(303, '/newuser')
        }
        try {
            let existingAccount = await database.existsUserForUsername(user)
            if (existingAccount) {
                // flash message telling user that username already taken
                req.session.flash = {
                    type:'danger',
                    intro:'Account Creation Error',
                    message:`There already exists a user with username ${user}`,
                    name:name,
                }
                return res.redirect(303, '/newuser')
            }
            // create new user in database
            await database.createUser(user, pwd1, name, Math.floor(Math.random() * 1000000000000000).toString(36))
            // Then user is returned to login page to log in with their new credentials
            req.session.flash = {
                type:'success',
                intro:'Account Created',
                message:'Registration successful, please log in.'
            }
            res.redirect(303, '/login')
        }
        catch (error) {
            app.errorHandler(error, req, res)
        }
    })

    // All the endpoints that will be added after these endpoints 
    // (other than the error handler)
    // require some type of authentication.
    // There are two types of endpoints: 
    // UI endpoints (those that return HTML), which require that one be logged in; and
    // API endpoints, which require that one have a valid API key.
    // API endpoints are distinguished by the fact that they have "api" as the first
    // component of the path.
    // Use middleware to intercept anything (except an error) from a non-authenticated client
    // and redirect as needed: back to the login page for the UI clients, and 
    // return the appropriate status codes for the API calls.
    app.use( async (req, res, next) => {
        let apiPathPattern = /^\/?api/
        if (apiPathPattern.test(req.path)) {
            // Paths starting with api are API endpoints.
            // To use the API, one must supply X-API-Key in the header. 
            // If it's not present, or is invalid, set status code to indicate, 
            // and terminate processing right here.
            let apiKey = req.headers["x-api-key"]
            if (!apiKey) {
                res.status(401)
                return res.end()
            }
            let user = await database.getUserForKey(apiKey)
            if (!user) {
                res.status(401)
                return res.end()
            }
            req.user = user
            next()
        }
        else {
            // NOT an API endpoint. Test logged-in state by examining session object.
            if (!req.session.userName) {
                return res.redirect(303, '/login')
            }
            next()
        }
    })

}