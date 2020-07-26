const express = require('express')
const app = express()
const port = process.env.PORT || 3000

/***********   API functions   *****************/
app.get('/blogdata/:name', (req, res) => {
	res.type('image/png')
	const name = req.params.name
	let filename = __dirname + '/blogdata/' + name + '.png'
	res.sendFile(filename)
})

app.use((req, res) => {
    res.type('text/plain')
    res.status(404)
    res.send('404 - Not Found')
})

app.use((err, req, res, next) => {
	console.error(err.message)
	res.type('text/plain')
	res.status(500)
	res.send('500 - Server Error')
})

app.listen(port, () => console.log(
	`Express started on http://localhost:${port}` +
	'press Ctrl-C to terminate.'))

    