const xml = require('xml')
const fs = require('fs');
const path = require('path')

const fileExists = async (path) => {
    return await new Promise( (resolve, reject) => {
        fs.access(path, fs.F_OK, (err) => {
            if (err) {
                resolve(false)
            } 
            else {
                resolve(true)
            }
        })
    });
}

const fileMove = async (oldPath, newPath) => {
    return await new Promise( (resolve, reject) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                resolve(false)
            }
            else {
                resolve(true)
            }
        })
    })
}

module.exports.sendImage = (name, req, res) => {
    res.type('image/png')
    let filename = __dirname + '/blogdata/' + name + '.png'
    console.log("Sending file: " + filename)
    res.sendFile(filename)
}

module.exports.makeFileName = async (ext) => {
    while (true) {
        basename = Math.floor(Math.random() * 1000000).toString(36) 
        filename = basename + '.' + ext
        newpath = path.join(__dirname, 'blogdata', filename )
        if (!(await fileExists(newpath))) {
            break
        }
    }
    return basename
}

module.exports.stashFile = async (oldPath, newFileName, ext) => {
    newpath = path.join(__dirname, 'blogdata', newFileName + '.' + ext )
    let success = await fileMove(oldPath, newpath)
    return success
}

