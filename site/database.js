const mongoose = require('mongoose');
const credentials = require("./credentials.js");
const dbUrl = 'mongodb://' + credentials.username +
	':' + credentials.password + '@' + credentials.host + ':' + credentials.port + '/' + credentials.database;

/* Singleton pattern for connection. */
let connection = null;
async function getConnection() {
	if (connection == null) {
        connection = await mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    return connection;
}

/* Connect to database. This MUST be invoked before using anything else.  */
module.exports.connect = async () => {
    console.log("Database...")
    try {
        const connection = await getConnection()
        console.log("Connected to database")
    }
    catch (error) {
        console.error("Failed to connect to database")
        process.exit(1)
    }
}

/* The mongoose module defines a class, Schema, that hanldes object-document mapping (ODM). */
let Schema = mongoose.Schema;

/* Define the Schema for each of the entities that we wish to persist to the database. */
let userSchema = new Schema({
    userName: String,
    password: String, // NOTE for production, this is not a secure way to do this-- should salt the passwords
    realName: String,
})
const User = mongoose.model("User", userSchema);

let postSchema = new Schema()
postSchema.add({
    title: String,
    bodytext: String,
    comments: [postSchema]
})

let groupSchema = new Schema({
    name: String,
    nickname: String,
    banner: String,
    bannerType: String,
    threads: [postSchema],
})
const Group = mongoose.model("Group", groupSchema);

module.exports.cleanOutDatabase = async() => {
    await User.deleteMany({});
    await Group.deleteMany({});
}

module.exports.getUser = async (user) => {
    let record = await User.findOne({userName:user})
    if (!record) {
        throw 'Unknown user!'
    }
    user = {userName: record.userName,
        realName: record.realName}
    return user
}

module.exports.existsUserForUsername = async (user) => {
    let record = await User.findOne({userName:user})
    if (record) {
        return true
    }
    else {
        return false
    }
}

module.exports.validateLogin = async (user, pwd) => {
    let record = await User.findOne({userName:user, password:pwd})
    console.log(record)
    if (record) {
        return true
    }
    else {
        return false
    }
}

exports.createUser = async (user, pwd, name) => {
    let newUser = new User({userName:user, password:pwd, realName:name})
    newUser.save()
}

module.exports.existsGroupWithNickname = async (gnick) => {
    let record = await Group.findOne({nickname:gnick})
    if (record) {
        return true
    }
    else {
        return false
    }
}

module.exports.createGroup = async (name, gnick) => {
    let newGroup = new Group({name:name, nickname:gnick})
    newGroup.save()
}

/* TODO: get only groups user belongs to, not all groups */
module.exports.getGroupsForUser = async (user) => {
    let groups = await Group.find({})
    let results = groups.map( group => {
        return {
            gnick: group.nickname,
            gname: group.name
        }
    })
    return results
}

module.exports.getGroup = async (gnick) => {
    let group = await Group.findOne({nickname:gnick}).lean()
    return group
}

module.exports.setGroupBanner = async (gnick, basename, ext) => {
    let query = {nickname:gnick}
    let group = await Group.findOne(query)
    group.banner = basename
    group.bannerType = ext
    group.save()
}

exports.addPost = async (gnick, title, bodytext) => {
    let group = await Group.findOne({nickname:gnick})
    group.threads.push({
        title: title,
        bodytext: bodytext
    })
    group.save();
}

