const express = require('express')
const database = require('./database')
var bodyParser = require('body-parser');
const expressHandlebars = require('express-handlebars')
const app = express()

app.use(express.static(__dirname + '/public'));

app.engine('handlebars', expressHandlebars({defaultLayout:'main'}))
app.set('view engine', 'handlebars')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Using in-memory sessions. This doesn't allow for scaling up well, so this could be
// improved upon. But, sufficient for getting started. See express-session documentation.
// The commentary in Brown chapter 9 is out of date. express-session no longer requires
// using the cookie-parser middleware.
const espressSessions = require('express-session');
app.use(espressSessions({
	secret: "This is such a good password",
	cookie: { maxAge: 60000 },
}))

const port = process.env.PORT || 3000

// Link in flash message middleware before any of the view routing.
require('./lib/flash')(app)

require('./lib/auth-endpoints')(app)
require('./lib/api')(app)

/*************** UI functions ******************/

require('./lib/groups')(app)
require('./lib/groupadmin')(app)
require('./lib/posts')(app)

// Error handlers must go LAST, this is where things fall through to
require('./lib/error-handling')(app);

( async () => {
	// Connect to the database first, before starting to listen on a port.
	await database.connect();
//	await database.cleanOutDatabase(); // enable this line to delete everything from database
	// Now that we know we must have a database connection, start listening for client requests.
	app.listen(port, () => {
		console.log(`Express started on http://localhost:${port}`)
		console.log('press Ctrl-C to terminate.')
	})
})()


    