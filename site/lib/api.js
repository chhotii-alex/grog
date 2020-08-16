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
    
    app.get('/api/group/:gnick', async (req, res) => {
        let { gnick } = req.params
        let info = await database.getGroupDataForUser(gnick, req.user)
        if (!info) {
            return res.status(404).end()
        }
        res.format({
            'application/json': () => {
                res.json(info)
            },
            'application/xml': () => {
                transformedThreads = info.threads.map( post => {
                    return { 'thread' : [
                        {_attr: {title: post.title, when: post.created_at, author:post.user}},
                        post.bodytext
                    ]} })
                let transform = {'group' : [
                        {_attr: {name: info.name, nickname:info.nickname}},
                        {threads: transformedThreads}
                ]}
                let xmlData = xml(transform, {indent:'  ', declaration:true}) + '\n'
                res.send(xmlData)
            },
        })  // END .format
    })

}