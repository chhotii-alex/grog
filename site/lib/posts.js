const media = require('../media')
const database = require('../database')

/***********   UI functions related to blog entries  *****************/
module.exports = app => {
    app.get('/blogdata/:name', (req, res) => {
        const name = req.params.name
        media.sendImgFile(name, res)
    })    

    app.get('/newpost', (req, res) => {
        const { gnick } = req.query;
        if (!gnick) {
            res.status(400)
            return res.render('error', { msg: "group not specified"})
        }
        res.render('newpostform', { gnick:gnick})
    })

    app.post('/newpost', async (req, res) => {
        const { gnick, title, bodytext } = req.body
        try {
            console.log("Just before addPost...")
            await database.addPost(gnick, title, bodytext)
            return res.redirect(303, `/group/${gnick}`)
        }
        catch (err) {
            return app.errorHandler(err, req, res)
        }
    })

    app.get('/post/edit', (req, res) => {
        const { pid, gnick } = req.query
        post = database.getPostByPid(pid)
        post.gnick = gnick
        return res.render('editpostform', post)
    })

    app.post('/post/edit', (req, res) => {
        const { pid, title, bodytext, gnick } = req.body
        post = database.getPostByPid(pid)
        post.title = title
        post.text = bodytext
        return res.redirect(303, `/group/${gnick}`)
    })
}