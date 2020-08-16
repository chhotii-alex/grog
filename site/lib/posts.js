const media = require('../media')
const database = require('../database')
const multiparty = require('multiparty')
const path = require('path');

/*
This module implements functionality related to creating and editing posts and comments.
A post (or comment) consists of a title, body text, and zero or more photos; and it is associated
with a particular group.
The /newpost GET endpoint provides the forms for editing a new post. It must be provided a query
parameter that identifies the group (by nickname). When this page is initially visited, a new
Post document is created in the database, within the Group; however, with the isPublished flag
set to false. By creating this object in the database at the start of the editing process, we can
associate image files with it as they are uploaded. 
Comments are implemented as Post documents embedded in another Post's comments collection. 
*/

/***********   UI functions related to blog entries  *****************/
module.exports = app => {
    app.get('/blogdata/:name', (req, res) => {
        const name = req.params.name
        media.sendImgFile(name, res)
    })    

    app.get('/newpost', async (req, res) => {
        let { gnick, id } = req.query;
        if (!gnick) {
            res.status(400)
            return res.render('error', { msg: "group not specified"})
        }
        if (id) {
            post = await database.getPostByGroupAndId(gnick, id)
            photos = post.photos
        }
        else {
            id = await database.addNascentPost(gnick)
            photos = []
        }
        res.render('newpostform', { layout:'group', gnick:gnick, id:id, photos:photos })
    })

    app.post('/newpost/photo', async (req, res) => {
        const form = new multiparty.Form()
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).send({ error: err.message })
            }
            const gnick = fields.gnick[0]   
            const id = fields.id[0]   // This is the id of the Post
            const filePath = files.item[0].path
            // pick off the file extension
            const ext = path.extname(filePath).substring(1)
            // make short name for this file
            newFileName = await media.makeFileName(ext)
            // copy this file into blogdata
            let success = await media.stashFile(filePath, newFileName, ext)
            if (success) {
                await database.addPhotoToPost(gnick, id, basename)
                res.redirect(303, `/newpost?gnick=${gnick}&id=${id}`)  
            }
            else {
                res.send('uploaded file not moved')
            }
        })    
    })

    app.post('/newpost', async (req, res) => {
        let { gnick, id, title, bodytext } = req.body
        let user = await database.getUser(req.session.userName)
        console.log(user)
        // The "public" flag is governed by a checkbox. So, if the checkbox isn't checked,
        // the value for public might be undefined rather than false-- which I don't think 
        // the database would like.
        public = ("public" in req.body) ? true : false
        try {
            console.log(user.realName)
            await database.publishPost(gnick, id, title, bodytext, public, user.realName)
            // await database.addCommentsToPost(gnick, id)
        }
        catch (err) {
            return app.errorHandler(err, req, res)
        }
        return res.redirect(303, `/group/${gnick}`)
    })

    app.get('/thread/:gnick/:pid', async (req, res) => {
        let { gnick, pid } = req.params
        let group = await database.getGroup(gnick)
        let post = await database.getPostByGroupAndId(gnick, pid)
        post.layout = 'group'
        post.group = {banner: group.banner}
        console.log("Showing detail for: ")
        console.log(post)
        return res.render('postdetail', post)
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