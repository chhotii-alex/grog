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
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    photos: [String],
    isPublic: Boolean,
    isPublished: Boolean,
    thread: String,  // _id of top-level post if this is a comment
})
postSchema.set('timestamps', { createdAt: 'created_at', updatedAt: 'updated_at' })
const Post = mongoose.model("Post", postSchema);

let groupSchema = new Schema({
    name: String,
    nickname: String,
    banner: String,
    threads: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
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
    await Post.deleteMany({});
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

/* The filteredCommentTree() function recursively populates comments and filters out those that should
    not be seen. 
    Input: an array of Post objects (typically all the comments on a Post)
    Output: processed version of the same array
    Processing consists of several stages:
    1) Filtering is done on isPublished
    2) The comments array on each one is populated (we ask MongoDB to replace the array of ID's
        with the array of actual objects referenced)
    3) The recursive step: filteredCommentTree is called on the comments array of each
    4) Each post is mapped to a transformed object. As this is done serveral things are accomplished:
        a) the resulting object is not a MongoDB object, and thus handlebars can read its values
        b) the group nickname is attached
        c) the ID of the thread is attached to each one
*/
async function filteredCommentTree(posts, gnick, thread) {
    let results = posts.filter( post => post.isPublished)
    let filteredComments = {}
    let i
    for (i = 0; i < results.length; ++i) {
        if (results[i].comments.length) {
            await results[i].populate("comments")
            await results[i].execPopulate()
            filteredComments[results[i]._id] = await filteredCommentTree(
                results[i].comments, gnick, thread)
        }
    }
    results =  results.map(  post =>  {
        return {
            _id: post._id,
            title: post.title,
            bodytext: post.bodytext,
            photos: post.photos,
            isPublic: post.isPublic,
            user: post.user,
            created_at: post.created_at,
            comments: filteredComments[post._id],
            gnick: gnick,
            thread: thread,
        }
    })
    return results
}

/* Get the data that is displayed on a group's page, including the group name, banner image filename,
    and the top-level posts.
    If the given user is not a member, only include public posts.
*/
module.exports.getGroupDataForUser = async (gnick, userID) => {
    console.log("Got user name:" + userID)
    let group = await (await Group.findOne({nickname:gnick})).populate("threads")
    if (!group) {
        return null
    }
    console.log(group)
    await group.execPopulate()
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
    let threads = group.threads.filter( thread => (thread.isPublished && (thread.isPublic || membershipLevel > 1)))
    threads = threads.map( thread => {
        return {
            _id: thread._id,
            title: thread.title,
            bodytext: thread.bodytext, 
            photos: thread.photos,
            isPublic: thread.isPublic,
            user: thread.user,
            created_at:thread.created_at
        }
    })
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
    let newPost = new Post({
        isPublished:false,
    })
    await newPost.save()
//    newPost.thread = newPost._id   // A top-level post is its own thread
//    newPost.save()
    group.threads.push(newPost._id)
    group.save()
    return newPost._id
}

exports.addPhotoToPost = async (gnick, id, filename) => {
    let post = await Post.findById(id)
    post.photos.push(filename)
    post.save()
}

/* Fetches a Post from the database and maps to a view object, but does NOT expand the comments. */
exports.getPostByGroupAndId = async (gnick, id) => {
    let post = await Post.findById(id)
    return {
        _id: post._id,
        title: post.title,
        bodytext: post.bodytext,
        photos: post.photos,
        isPublic: post.isPublic,
        user: post.user,
        created_at: post.created_at
    }
}

/*
    Queries for the top-level post in a thread by ID, and all its children (comments and comments
        on comments etc.) (if any).
    We pass in gnick (the nickname of the group) to be attached to each item in the tree.
    We also pass in the id of the top-level one we're looking for as the thread identifier
        for every item in the tree. If the user choses to make a comment on a post, the thread
        id will be used to navigate to the thread view afterwards.
*/
exports.getPostAndCommentsTree = async (gnick, id) => {
    let post = await Post.findById(id).populate("comments")
    if (!post) {
        return null
    }
    await post.execPopulate()
    let commentsToShow = await filteredCommentTree(post.comments, gnick, id)
    return {
        _id: post._id,
        title: post.title,
        bodytext: post.bodytext,
        photos: post.photos,
        isPublic: post.isPublic,
        comments: commentsToShow,
        user: post.user,
        created_at: post.created_at
    }
}

exports.updatePost = async (gnick, id, title, bodytext) => {
    let post = await Post.findById(id)
    if (!post) {
        throw 'post ${id} not found'
    }
    post.title = title
    post.bodytext = bodytext
    await post.save();
}

exports.removePost = async (pid) => {
    await Post.findByIdAndDelete(pid)
}

exports.publishPost = async (gnick, id, title, bodytext, isPublic, user) => {
    let post = await Post.findById(id)
    if (!post) {
        throw 'post ${id} not found'
    }
    post.title = title
    post.bodytext = bodytext
    post.isPublic = isPublic
    post.isPublished = true
    post.user = user
    await post.save();
    return post
}

exports.addNascentComment = async (parentPostId, thread) => {
    let post = await Post.findById(parentPostId)
    if (!post) {
        throw 'post ${id} not found'
    }
    let comment = new Post({
        isPublished: false,
        thread: thread,
    })
    await comment.save()
    post.comments.push(comment._id)
    await post.save()
    return comment._id
}

