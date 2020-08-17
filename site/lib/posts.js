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
    app.get('/newpost', async (req, res) => {
        let { gnick, id, parent, thread } = req.query;
        if (!gnick) {
            res.status(400)
            return res.render('error', { msg: "where to put this post not specified"})
        }
        if (id) {
            post = await database.getPostByGroupAndId(gnick, id)
            photos = post.photos
        }
        else {
            post = null
            if (parent) {
                id = await database.addNascentComment(parent, thread)
            }
            else {
                id = await database.addNascentPost(gnick)
            }
            photos = []
        }
        formdata = { layout:'group', 
            gnick:gnick, id:id, photos:photos,
        }
        if (post) {
            formdata.title = post.title
            formdata.bodytext = post.bodytext
        }
        res.render('newpostform', formdata)
    })

    app.post('/newpost/photo', async (req, res) => {
        const form = new multiparty.Form()
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.log("error parsing form")
                console.log(err)
                return res.status(500).send({ error: err.message })
            }
            const gnick = fields.gnick[0]   
            const id = fields.id[0]   // This is the id of the Post
            const title = fields.title[0]
            const bodytext = fields.bodytext[0]
            // Save any progress the user has made on editing the title & body text so far
            // into the database. When we re-direct these will be filled back into the form.
            // TODO: Not dealing with "public" checkbox correctly
            try {
                await database.updatePost(gnick, id, title, bodytext)
            }
            catch (err) {
                return app.errorHandler(err, req, res)
            }

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
        const form = new multiparty.Form()
        form.parse(req, async (err, fields, files) => {
            console.log("In parse callback")
            if (err) {
                console.log("error parsing form")
                console.log(err)
                return res.status(500).send({ error: err.message })
            }
            let user = await database.getUser(req.session.userName)
            const gnick = fields.gnick[0]   
            const id = fields.id[0]   // This is the id of the Post
            const title = fields.title[0]
            const bodytext = fields.bodytext[0]
            // Dealing with a checkbox is weird
            let public = ("public" in fields) ? true : false
            try {
                post = await database.publishPost(gnick, id, title, bodytext, public, user.realName)
            }
            catch (err) {
                return app.errorHandler(err, req, res)
            }
            if (post.thread) {
                return res.redirect(303, `/thread/${gnick}/${post.thread}`)
            }
            else {
                return res.redirect(303, `/group/${gnick}`)
            }
        })    
    })

    app.get('/thread/:gnick/:pid', async (req, res) => {
        let { gnick, pid } = req.params
        let group = await database.getGroup(gnick)
        let post = await database.getPostAndCommentsTree(gnick, pid)
        post.layout = 'group'
        post.group = {banner: group.banner,
                    gnick: group.nickname,
                    gname: group.name}
        return res.render('postdetail', post)
    })

    app.post('/post/delete/:gnick/:pid', async (req, res) => {
        let { gnick, pid } = req.params 
        await database.removePost(pid)
        req.session.flash = {
            type:'info',
            intro:'Post Deleted',
            message:`You have successfully deleted a post.`,
        }
        return res.redirect(303, `/group/${gnick}`)
    })

}