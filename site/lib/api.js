const database = require('../database')
const xml = require('xml')
const media = require('../media')

/***********   API functions   *****************/
module.exports = app => {

    /* TODO: This shouldn't just give any image out to anyone. Images might be 
        privacy concerns. Ideally we should have some permissions infrastructure around
        images. Images belong to Posts or Groups. If an image belongs to a Post that is not
        publically available, we should check that the user belongs to that Post's Group
        before serving out the image. This would require a database collection of image records...
    */ 
    app.get('/api/blogdata/:name', (req, res) => {
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