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
    apiKey: String,
    groups: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group"
        }
    ]
})
const User = mongoose.model("User", userSchema);

let postSchema = new Schema()
postSchema.add({
    title: String,
    bodytext: String,
    user: String,
    comments: [postSchema],
    photos: [String],
    isPublic: Boolean,
    isPublished: Boolean
})
postSchema.set('timestamps', { createdAt: 'created_at', updatedAt: 'updated_at' })
const Post = mongoose.model("Post", postSchema);

let groupSchema = new Schema({
    name: String,
    nickname: String,
    banner: String,
    threads: [postSchema],
    moderators: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    applicants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
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
        realName: record.realName,
        _id: record._id,
        apiKey:record.apiKey,
    }
    return user
}

module.exports.getUserForKey = async (apiKey) => {
    let record = await User.findOne({apiKey:apiKey})
    return record
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

exports.createUser = async (user, pwd, name, apiKey) => {
    let newUser = new User({userName:user, password:pwd, realName:name, apiKey:apiKey})
    newUser.save()
}

/*  This is used when creating a new group, to make sure that we don't get two groups with
    the same nickname.
*/
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
    return newGroup.save()
}

module.exports.addGroupToUser = async (gnick, accountName) => {
    let group = await Group.findOne({nickname:gnick})
    let user = await User.findOne({userName:accountName})
    if (!group || !user) {
        throw 'Bad identifiers!'
    }
    return User.findByIdAndUpdate(
		user._id, 
		{ $addToSet: { groups: group._id} },
		{new: true}
	);
}
module.exports.removeGroupFromUser = async (gnick, userName) => {
    let group = await Group.findOne({nickname:gnick})
    let user = await User.findOne({userName:userName})
    if (!group || !user) {
        throw 'Bad identifiers!'
    }
    await User.findByIdAndUpdate(
		user._id, 
		{ $pullAll: { groups: [ group._id ] } },
    );
}


/* 
    role: MUST be one of the User collection names in the Group schema:
        moderators, members, or applicants
*/
module.exports.addUserToGroup = async (gnick, accountName, role) => {
    let user = await User.findOne({userName:accountName})
    if (!user) {
        throw 'Bad identifier!'
    }
    let setId = {}
    setId[role] = user._id
    return Group.findOneAndUpdate(
		{nickname:gnick}, 
		{ $addToSet: setId },
		{new: true}
	)
}
module.exports.removeUserFromGroup = async (gnick, accountName, role) => {
    let user = await User.findOne({userName:accountName})
    if ( !user) {
        throw 'Bad identifier!'
    }
    let setId = {}
    setId[role] = [ user._id ]
    return Group.updateOne(
        {nickname:gnick},
        { $pullAll: setId },
    )
}

module.exports.isUserMemberOfGroup = async (userID, groupID) => {
    let group = await Group.findById(groupID)
    if (group.moderators.includes(userID)) return true
    if (group.members.includes(userID)) return true
    return false
}
module.exports.isUserModeratorOfGroup = async (userID, groupID) => {
    let group = await Group.findById(groupID)
    if (group.moderators.includes(userID)) return true
    return false
}

module.exports.isUserApplicantOfGroup = async (userID, groupID) => {
    let group = await Group.findById(groupID)
    if (group.applicants.includes(userID)) return true
    return false
}


module.exports.getGroupsForUser = async (user) => {
    let userObj = await User.findOne({userName:user}).populate("groups")
    let results = userObj.groups.map( group => {
        return {
            gnick: group.nickname,
            gname: group.name,
            _id: group._id,
        }
    })
    return results
}

module.exports.getAllGroups = async () => {
    let groups = await Group.find({})
    let results = groups.map( group => {
        return {
            gnick: group.nickname,
            gname: group.name,
            _id: group._id,
            banner:group.banner,
        }
    })
    return results
}

function filteredPosts(posts, showAll) {
    console.log("Passed in to filteredPosts")
    console.log(posts)
    let results;
    if (showAll) {
        results = posts
    }
    else {
        console.log("Only showing public stuff because showAll is false")
        results = posts.filter( post => post.isPublic) 
    }
    console.log("Results:")
    console.log(results)
    results = results.filter( post => post.isPublished)
    results = results.map( post => {
        return {
            _id: post._id,
            title: post.title,
            bodytext: post.bodytext,
            photos: post.photos,
            isPublic: post.isPublic,
            user: post.user,
            created_at: post.created_at,
            comments: [
                {
                    title: "Here is my comment.",
                    bodytext: "I have so much to say.",
                    isPublic: true,
                    user: "Santa Claus",
                    comments: [
                        {
                            title: "but",
                            bodytext: "I totally disagree.",
                            isPublic: true,
                            user: "Grinch",
                            comments:[]
                        }
                    ]
                },
                {
                    title:"thoughts",
                    bodytext:"I have a thought.",
                    isPublic:true,
                    user:"Turtle",
                    comments:[]
                }
            ]
            // TODO: really actually do this comments: filteredPosts(post.comments, showAll)
        }
    })
    console.log("Filtered posts:")
    console.log(results)
    return results
}

module.exports.getGroupDataForUser = async (gnick, userID) => {
    let group = await Group.findOne({nickname:gnick})
    if (!group) {
        return null
    }
    let membershipLevel = 0
    if (group.moderators.includes(userID)) {
        membershipLevel = 3
    }
    else if (group.members.includes(userID)) {
        membershipLevel = 2
    }
    else if (group.applicants.includes(userID)) {
        membershipLevel = 1
    }
    // Sort the top-level posts in reverse chronological order of creation:
    group.threads.sort((a, b) => b.created_at - a.created_at )
    threads = filteredPosts(group.threads, membershipLevel > 1)
    result = {
        name:group.name,
        nickname:group.nickname,
        threads:threads,
        banner:group.banner,
        _id:group._id,
    }
    return result
}

module.exports.getGroup = async (gnick, populateMembers = false) => {
    let group = await Group.findOne({nickname:gnick})
    if (!group) {
        return null
    }
    if (populateMembers) {
        group.populate("moderators").populate("members").populate("applicants")
        await group.execPopulate()
        moderators = group.moderators.map(user => {
            return {
                realName: user.realName,
                _id: user._id,
                userName: user.userName,
            }
        })
        members = group.members.map(user => {
            return {
                realName: user.realName,
                _id: user._id,
                userName: user.userName,
            }
        })
        applicants = group.applicants.map(user => {
            return {
                realName: user.realName,
                _id: user._id,
                userName: user.userName,
            }
        })
    }
    result = {
        name:group.name,
        nickname:group.nickname,
        banner:group.banner,
        _id:group._id,
    }
    if (populateMembers) {
        result.moderators = moderators
        result.members = members
        result.applicants = applicants
    }
    return result
}

module.exports.setGroupBanner = async (gnick, basename, ext) => {
    let query = {nickname:gnick}
    let group = await Group.findOne(query)
    group.banner = basename
    group.save()
}

exports.addNascentPost = async (gnick) => {
    let group = await Group.findOne({nickname:gnick})
    let newPost = new Post({isPublished:false})
    group.threads.push(newPost)
    group.save()
    return newPost._id
}

exports.addPhotoToPost = async (gnick, id, filename) => {
    console.log("Doing addPhotoToPost")
    let group = await Group.findOne({nickname:gnick})
    let post = group.threads.find(element => element._id == id)
    console.log("Found this Post?")
    console.log(post)
    post.photos.push(filename)
    group.save()
} 

exports.getPostByGroupAndId = async (gnick, id) => {
    let showAll = true // TODO: set this according to status of user
    let group = await Group.findOne({nickname:gnick})
    let post = group.threads.find(element => element._id == id)
    console.log("From database:")
    console.log(post)
    phonyComments = [{
        title: "Here is my comment.",
        bodytext: "I have so much to say.",
        isPublic: true,
        isPublished:true,
        user: "Santa Claus",
    }]
    return {
        _id: post._id,
        title: post.title,
        bodytext: post.bodytext,
        photos: post.photos,
        isPublic: post.isPublic,
        comments: filteredPosts(phonyComments, showAll)
    }
}

exports.updatePost = async (gnick, id, title, bodytext) => {
    let group = await Group.findOne({nickname:gnick})
    if (!group) {
        console.log(`Group ${gnick} not found`)
    }
    let post = group.threads.find(element => element._id == id)
    if (!post) {
        console.log('post ${id} not found')
    }
    post.title = title
    post.bodytext = bodytext
    await group.save();
}

exports.publishPost = async (gnick, id, title, bodytext, isPublic, user) => {
    console.log("We will attribute this to: " + user)
    let group = await Group.findOne({nickname:gnick})
    if (!group) {
        console.log(`Group ${gnick} not found`)
    }
    let post = group.threads.find(element => element._id == id)
    if (!post) {
        console.log('post ${id} not found')
    }
    post.title = title
    post.bodytext = bodytext
    post.isPublic = isPublic
    post.isPublished = true
    post.user = user
    console.log(user)
    await group.save();
}

exports.addCommentsToPost = async (gnick, id) => {
    let group = await Group.findOne({nickname:gnick})
    let post = group.threads.find(element => element._id == id)
    let comment = new Post({
        title: "this is a comment",
        bodytext: "here is the body of the comment",
        isPublic: true,
        isPublished: true,
        comments:[ ]
    })
    post.comments.push(comment)
    await group.save()
    console.log("ID for comment:" + comment._id)

    let metaComment = new Post({
        title: "meta-comment",
        bodytext: "And I have a comment on your commnt.",
        isPublic: true,
        isPublished: true,
        comments: []
    })
    comment.comments.push(metaComment)
    await group.save()
    console.log("ID for comment on comment:" + metaComment._id)
}

