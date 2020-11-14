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
let message_history = [];

io.on('connection', (socket) => {
    let user_id = null;
    socket.emit('first_connection', null);

    socket.on('returning_user', (uid) => {
        let ret_user = null;
        users.filter(user => {
            if (user.id === uid) {
                ret_user = user;
                user.connected = true;
                user_id = uid;
            }
        });
        if (ret_user === null) {
            setupNewUser();
        } else {
            setupUser(ret_user);
        }
    });

    socket.on('new_user', () => {
        setupNewUser();
    });

    socket.on('chat message', (msg_in) => {
        if(msg_in.text.includes("<") || msg_in.text.includes(">")){
            socket.emit('custom_error', {"message": "HTML special characters are not allowed at this time"});
            return;
        }
        if(msg_in.text.startsWith("/")){
            if(msg_in.text.startsWith("/name ")){
                changeUsername(msg_in);
            }
            else if(msg_in.text.startsWith("/color ")){
                changeColor(msg_in);
            }
            else{
                socket.emit('custom_error', {"message": "Bad command"});
            }
        }
        else {
            sendMessage(msg_in);
        }
    });

    socket.on('disconnect', () => {
        id = id.filter(item => item !== socket.id);
        users.filter(user => {
            if(user.id === user_id){
                user.connected = false;
            }
        });
        io.emit('connected_users', users);
        console.log(user_id + " disconnected");
        console.log(id.length + " remaining users are " + id);
    });

    function setupNewUser() {
        let username = name_generator.generate();
        const user = {
            "id": socket.id,
            "username": username,
            "color": "white",
            "connected": true
        };
        users.push(user);
        user_id = socket.id;
        setupUser(user);
    }

    function setupUser(user){
        id.push(socket.id);
        socket.emit('user_info', {"username": user.username, "color": "white", "id": user_id});
        io.emit('connected_users', users);
        socket.emit('message_history', message_history);
        console.log("User " + user_id + " connected, now " + id.length);
    }

    function changeUsername(msg_in) {
        const new_username = msg_in.text.substring(6);
        let error = 0;
        users.filter(user => {
            if(user.username === new_username){
                error = 1;
                socket.emit('custom_error', {"message": "Username already taken"});
            }
        });
        if(error === 0){
            users.filter(user => {
                if(user.id === msg_in.uid){
                    user.username = new_username;
                }
            });
            io.emit('connected_users', users);
        }
    }

    function changeColor(msg_in){
        let new_color = msg_in.text.substring(7).toLowerCase();
        if(!validate_color.validateHTMLColorName(new_color) && !validate_color.validateHTMLColorHex(new_color)){
            socket.emit('custom_error', {"message": "Not a valid color"});
        } else {
            users.filter(user => {
                if (user.id === msg_in.uid) {
                    user.color = new_color;
                }
            });
            message_history.filter(message => {
                if(message.uid === msg_in.uid){
                    message.color = new_color;
                }
            })
            io.emit('connected_users', users);
            socket.emit('message_history', message_history);
        }
    }

    function sendMessage(msg_in) {
        const date = new Date();
        let msg_out = msg_in;
        msg_out.timeStamp = date.getHours() + ":" + date.getMinutes();
        msg_out.text = msg_out.text.replace(":)", "😄");
        msg_out.text = msg_out.text.replace(":(", "🙁");
        msg_out.text = msg_out.text.replace(":o", "😮");
        io.emit('chat message', msg_out);
        if(message_history.length >= 200){
            message_history = message_history.slice();
        }
        message_history.push(msg_out);
    }
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});