/***********   UI functions related to groups  *****************/

const database = require('../database')
const media = require('../media')
const multiparty = require('multiparty')
const fs = require('fs');
const path = require('path')


module.exports = app => {
    app.get('/landing', async (req, res) => {
        try {
            let user = await database.getUser(req.session.userName)
            let groups = await database.getGroupsForUser(req.session.userName )
            console.log("Returned from getGroupsForUser:")
            console.log(groups)
            let data = { user: user, groups:groups }
            res.render('landing', data )
        }
        catch (error) {
            return app.errorHandler(error, req, res)
        }
    })
    
    app.get('/newgroup', (req, res) => {
        res.render('newgroupform')
    })
    app.post('/newgroup', async (req, res) => {
        let { gname, gnick } = req.body
        try {
            // TODO squeeze any spaces or special characters out of gnick, 
            // and check for uniqueness
            let nickTaken = await database.existsGroupWithNickname(gnick)
            if (nickTaken) {
                console.log("Nickname already taken")
                return res.redirect(303, '/newgroup')
            }
            // TODO create new group in database
            await database.createGroup(gname, gnick)
            // Now go to the page for that group
            res.redirect(303, `/group/${gnick}`)
        }
        catch (error) {
            return app.errorHandler(error, req, res)
        }
    })
    
    app.get('/group/:gnick', async (req, res) => {
        let { gnick } = req.params
        try {
            let user = await database.getUser(req.session.userName)
            console.log(user)
            let group = await database.getGroup(gnick)
            let info = { 
                group:group,
                user:user, 
                admin:true, // TODO: only give moderators admin privs
            }
            console.log("Datat to populate page:")
            console.log(info)
            res.render('groupmain', info)
        }
        catch (error) {
            return app.errorHandler(error, req, res)
        }
    })

    app.get('/group/admin/:gnick', async (req, res) => {
        const gnick = req.params.gnick
        try {
            let group = await database.getGroup(gnick)
            res.render('groupadmin', group)
        }
        catch (error) {
            return app.errorHandler(error, req, res)
        }
    })
    
    app.get('/blogdata/img/:name', async (req, res) => {
        const name = req.params.name
        return media.sendImage(name, req, res)
    })

    app.post('/group/banner', async (req, res) => {
        const form = new multiparty.Form()
        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(500).send({ error: err.message })
            }
            const gnick = fields.gnick[0]  
            const filePath = files.banner[0].path
            // pick off the file extension
            const ext = path.extname(filePath).substring(1)
            // make short name for this file
            newFileName = await media.makeFileName(ext)
            // copy this file into blogdata
            let success = await media.stashFile(filePath, newFileName, ext)
            if (success) {
                await database.setGroupBanner(gnick, basename, ext)
                res.redirect(303, `/group/${gnick}`)  
            }
            else {
                res.send('uploaded file not moved')
            }
        })
    })
         
}