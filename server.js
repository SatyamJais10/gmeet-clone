const express = require('express');
const path = require('path');
var app = express();
const PORT = process.env.PORT || 3000;
var server = app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}!`);
});
const fs = require('fs');
const fileUpload = require('express-fileupload');

//socket io linking with server
const io = require('socket.io')(server, {
    allowEIO3: true //false by default
});
app.use(express.static(path.join(__dirname, "")));

//connect server to index.html client page 
var userConnections = [];//all users info
io.on("connection", (socket) => {
    //inform admin/server side abt a new socket connection
    console.log("Socket id is: ", socket.id);
    socket.on("userconnect", (data) => {
        console.log("userconnect", data.displayName, data.meetingid);
        //other users info
        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid
        );
        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid
        });
        var userCount = userConnections.length;
        console.log(userCount);
        //to alert other users abt client joining
        other_users.forEach((v) => {
            socket.to(v.connectionId).emit("inform_others_about_client", {
                other_user_id: data.displayName,
                connId: socket.id,
                userNumber: userCount
            })
        })
        socket.emit("inform_client_about_other_user", other_users);
    });
    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connId).emit("SDPProcess", {
            message: data.message,
            from_connId: socket.id,
        })
    })
    socket.on("sendMessage", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id)
        if (mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showChatMessage", {
                    from: from,
                    message: msg
                })
            })
        }
    })

    socket.on("fileTransferToOther", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id)
        if (mUser) {
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showFileMessage", {
                    username: msg.username,
                    meetingid: msg.meetingid,
                    filePath: msg.filePath,
                    fileName: msg.fileName,
                })
            })
        }
    })

    socket.on("disconnect", function () {
        console.log("Disconnected!");
        var disUser = userConnections.find((p) => p.connectionId == socket.id);
        if (disUser) {
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter((p) => p.connectionId != socket.id);
            var list = userConnections.filter((p) => p.meeting_id == meetingid)
            list.forEach((v) => {
                var userNumberAfterUserLeave = userConnections.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user", {
                    connId: socket.id,
                    uNumber: userNumberAfterUserLeave
                })
            })
        }
    })
});

app.use(fileUpload());

app.post("/attachimg", function (req, res) {
    var data = req.body;
    var imageFile = req.files.zipfile;
    console.log(imageFile);
    var dir = "public/attachment/" + data.meeting_id + "/";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    imageFile.mv("public/attachment/" + data.meeting_id + "/" + imageFile.name, function (error) {
        if (error) {
            console.log("Couldn't upload image file!, error: ", error);
        } else {
            console.log("Image file successfully uploaded!");
        }
    })
})