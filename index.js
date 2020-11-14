const app = require('express')();
const http = require('http').createServer(app);
const socket_io = require('socket.io');
const io = socket_io(http);
const name_generator = require('random-username-generator');
const validate_color = require('validate-color');
const express = require('express');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

let users = [];
let id = [];
let num_users = 0;
let message_history = [];

io.on('connection', (socket) => {
    if(id.includes(socket.id)) { //Check if user has been here before
        //Change status to connected
    }
    else {
        let username = name_generator.generate();
        users.push({
            "id": socket.id,
            "username": username,
            "color": "white",
            "connected": true
        });
        id.push(socket.id);
        socket.emit('first_connection', {"username": username, "color": "white", "id": socket.id});
        io.emit('connected_users', users);
    }
    num_users++;
    socket.emit('message_history', message_history);
    console.log("User " + socket.id + " connected, now " + num_users);

    socket.on('chat message', (msg_in) => {
        if(msg_in.text.startsWith("/name ")){
            const new_username = msg_in.text.substring(6);
            let error = 0;
            users.filter(user => {
                if(user.username === new_username){
                    error = 1;
                    socket.emit('error', {"message": "Username already taken"});
                }
            });
            if(error === 0){
                users.filter(user => {
                    if(user.id === socket.id){
                        user.username = new_username;
                    }
                });
                io.emit('connected_users', users);
                return;
            } else {
                return;
            }
        }
        else if(msg_in.text.startsWith("/color ")){
            let new_color = msg_in.text.substring(7).toLowerCase();
            if(!validate_color.validateHTMLColor(new_color)){
                socket.emit('error', {"message": "Not a valid color"});
                return;
            } else {
                users.filter(user => {
                    if (user.id === socket.id) {
                        user.color = new_color;
                    }
                });
                io.emit('connected_users', users);
                return;
            }
        }
        else if(msg_in.text.startsWith("/")){
            socket.emit('error', {"message": "Bad command"})
            return;
        }
        const date = new Date();
        let msg_out = {};
        msg_out.timeStamp = date.getHours() + ":" + date.getMinutes();
        msg_out.username = msg_in.username;
        msg_out.text = msg_in.text;
        msg_out.color = msg_in.color;
        msg_out.id = msg_in.id;
        console.log(msg_out.text);
        msg_out.text = msg_out.text.replace(":)", "😄");
        msg_out.text = msg_out.text.replace(":(", "🙁");
        msg_out.text = msg_out.text.replace(":o", "😮");
        console.log(msg_out.text);
        io.emit('chat message', msg_out);
        if(message_history.length >= 200){
            message_history = message_history.slice();
        }
        message_history.push(msg_out);
    });

    socket.on('disconnect', () => {
        id = id.filter(item => item !== socket.id);
        users.filter(user => {
            if(user.id === socket.id){
                user.connected = false;
            }
        });

        // Figure out which user disconnected and set them to disconnected
        num_users--;
        io.emit('connected_users', users);
        console.log(socket.id + " disconnected");
        console.log(num_users + " remaining users are " + id);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});