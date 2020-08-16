/***********   UI functions related to groups  *****************/

const database = require('../database')
const media = require('../media')
const multiparty = require('multiparty')
const fs = require('fs');
const path = require('path');
const { RSA_NO_PADDING } = require('constants');


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
                req.session.flash = {
                    type:'danger',
                    intro:'Group Creation Error',
                    message:`There already exists a group with the nickname "${gnick}"`,
                    gname:gname,
                }
                return res.redirect(303, '/newgroup')
            }
            // create new group in database
            g = await database.createGroup(gname, gnick)
            // Add this group for the current user
            await database.addGroupToUser(gnick, req.session.userName)
            // ...and add the user to the group. Since this user created the 
            // group, she's a moderator.
            await database.addUserToGroup(gnick, req.session.userName, 'moderators')
            // Now go to the page for that group
            res.redirect(303, `/group/${gnick}`)
        }
        catch (error) {
            console.log(error)
            return app.errorHandler(error, req, res)
        }
    })

    app.get('/allgroups', async (req, res) => {
        let allgroups = await database.getAllGroups()
        let user = await database.getUser(req.session.userName)
        res.render('grouplist', {user:user, groups:allgroups})
    })
    
    app.get('/group/:gnick', async (req, res) => {
        let { gnick } = req.params
        try {
            let user = await database.getUser(req.session.userName)
            let group = await database.getGroupDataForUser(gnick, user._id)
            if (!group) {
                return res.status(404).render('404')
            }
            let member = await database.isUserMemberOfGroup(user._id, group._id)
            let admin = false
            if (member) {
                admin = await database.isUserModeratorOfGroup(user._id, group._id)
            }
            let applied = false
            if (!member) {
                applied = await database.isUserApplicantOfGroup(user._id, group._id)
            }
            let info = { 
                group:group,
                user:user, 
                member:member,
                admin:admin, // TODO: only give moderators admin privs
                applied:applied,
                layout:'group'
            }
            res.render('groupmain', info)
        }
        catch (error) {
            console.log("caught")
            console.log(error)
            return app.errorHandler(error, req, res)
        }
    })

    app.post('/group/apply', async (req, res) => {
        let gnick = req.body.gnick;
        // Add this group for the current user
        await database.addGroupToUser(gnick, req.session.userName)
        // ...and add the user to the group; not as a member yet, just as an applicant.
        await database.addUserToGroup(gnick, req.session.userName, 'applicants')
        // Now re-display to the page for that group
        res.redirect(303, `/group/${gnick}`)
    })

    app.get('/group/admin/:gnick', async (req, res) => {
        const gnick = req.params.gnick
        try {
            let group = await database.getGroup(gnick, true)
            data = {group: group, layout: 'group'}
            res.render('groupadmin', data)
        }
        catch (error) {
            return app.errorHandler(error, req, res)
        }
    })
    app.post('/group/acceptapplicant', async (req, res) => {
        console.log("Doing /group/acceptapplicant")
        const userName = req.body.userName
        const gnick = req.body.gnick
        console.log(userName)
        console.log(gnick)
        await database.addUserToGroup(gnick, userName, 'members')
        await database.removeUserFromGroup(gnick, userName, 'applicants')
        const url = `/group/admin/${gnick}`
        res.redirect(303, url)
    })
    app.post('/group/rejectapplicant', async (req, res) => {
        const userName = req.body.userName
        const gnick = req.body.gnick
        await database.removeGroupFromUser(gnick, userName)
        await database.removeUserFromGroup(gnick, userName, 'applicants')
        const url = `/group/admin/${gnick}`
        res.redirect(303, url)
    })
    app.post('/group/addmod', async (req, res) => {
        const userName = req.body.userName
        const gnick = req.body.gnick
        await database.addUserToGroup(gnick, userName, 'moderators')
        await database.removeUserFromGroup(gnick, userName, 'members')
        const url = `/group/admin/${gnick}`
        res.redirect(303, url)
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