How to run GROG:

The UI is pretty minimal, as I have focused on the back-end functionality. So hopefully this document helps you discover all the functionality.

MongoDB must be running on localhost port 27017. Credentials are for database name cs602db, user cs602_user, password s602_secret.

Start the app by invoking "node grog.js" in the site directory.

Navigate to http://localhost:3000/ in Chrome (other browsers should be fine, but not tested). Click on "Don't have an account? Click here to register." Fill in the New Account form as directed (although, note, it doesn't actually validate that the password is at least 8 characters long; strengthening the security features is beyond the scope of the term project.)

Log into the account you've created.

Click on "Create New Group". Enter any group name. Enter a group identifier that doesn't contain spaces or special characters (enforcing that would be a desirable enhancement).

Click on "Create Group" and you are taken to the main page for the new group. You are automatically a moderator for a group you create. Click on the "Manage Group" link at the bottom. Make there be a banner image for the group by uploading a PNG file on the Admin Page. You are taken back to the main page for the new group.

Start a new thread of discussion by clicking "Start New Thread." At any point while editing the text that's to be posted, you can upload an image (PNG format only) to be associated with this text. Upload any number of pictures. Before clicking Publish, turn on the "Publicly Viewable" checkbox so that this post is visible under any login.

Start another thread, and this time do not check "Publicly Viewable". You will see your two threads of discussion listed in reverse chronological order. 

Click "Return to Main Page", then click "Logout", then create another account and log in as the other account.

You don't yet see the group that was created under the other account on your landing page. Click "Browse All Groups...". Click on the name of the group. You can see the "publicly viewable" post but not the other post, nor can you view or make comments. Click on "Apply for Membership in This Group". 

Return to Main Page, Logout, and log back in as the first user. Now you are the user that created the group and, as a moderator, you can give the other user permissions on this group.
Click on the group name, then click "Manage Group". Under "Applicants", you see the second user's name, and "Accept" and "Reject" buttons. Click on the Accept button, and the second user is moved to the "Members" list. Now if you log out and log back in as the second user, and go to that group, you can see all posts. You can also start a new thread. 

Under a post you can click on "Comments...". This takes you to a page for just that thread of discussion. Under the text, next to the Post ID, click on "Comment on this...". This takes you to the same form for creating a post as was used for a new thread. However, when you publish that one, it appears on the comments page for the thread you were commenting on. You can even make comments on comments.

The API

Try these curl commands (with some substitutions):

curl -i -H "X-API-Key:2rlbd0ep96" -H "Accept:application/xml" http://localhost:3000/api/group/tennis;echo
curl -i -H "X-API-Key:2rlbd0ep96" -H "Accept:application/json" http://localhost:3000/api/group/tennis;echo

In place of 2rlbd0ep96 put whatever string it shows you next to "API Key" on your landing page. In place of tennis put the group identifier for a group you've created.

These just show the text of top-level posts, not comments. To get all comments, there's another API call.

In the output you'll see pid attributes (in the XML) or _id keys (in the json). These are post ID's. Execute either of these commands:

curl -i -H "X-API-Key:2rlbd0ep96" -H "Accept:application/xml" http://localhost:3000/api/post/5f3941b3b0dd58404207e0bf;echo
curl -i -H "X-API-Key:2rlbd0ep96" -H "Accept:application/json" http://localhost:3000/api/post/5f3941b3b0dd58404207e0bf;echo

Again, fill in YOUR api key. (An unrecognized API key will return HTTP/1.1 401 Unauthorized and zero content length.) The last part of the path is the post ID. 

* after posting comment, go to thread page, not group main page

