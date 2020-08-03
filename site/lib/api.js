const database = require('../database')
const xml = require('xml')
const media = require('../media')

/***********   API functions   *****************/
module.exports = app => {
    app.get('/api/blogdata/:name', (req, res) => {
        console.log("Doing endpoint /api/blogdata/?")
        const name = req.params.name
        return media.sendImage(name, req, res)
    })
    
    app.get('/api/group/:gnick', (req, res) => {
        let { gnick } = req.params
        let posts = database.getPostsForGroup(gnick)
        let info = { gnick: gnick, 
            gname: "Name Of Group", 
            user:req.session.userName, 
            admin:true,
            posts:posts }
        res.format({
            'application/json': () => {
                res.json(data)
            },
            'application/xml': () => {
                let xmlData = xml(data, {indent:'  ', declaration:true}) + '\n'
                res.send(xmlData)
            },
        })  // END .format
    })

}