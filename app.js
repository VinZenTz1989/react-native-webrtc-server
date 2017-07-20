var _ = require("lodash");
var express = require("express");
var app = express();
var fs = require("fs");
var open = require("open");
var options = {
  key: fs.readFileSync("./fake-keys/privatekey.pem"),
  cert: fs.readFileSync("./fake-keys/certificate.pem")
};
var serverPort = process.env.PORT || 4443;
var https = require("https");
var http = require("http");
var server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require("socket.io")(server);

app.get("/client", function(req, res) {
  res.sendFile(__dirname + "/client.html");
});

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});



server.listen(serverPort, function() {
  console.log("server up and running at %s port", serverPort);
  if (process.env.LOCAL) {
    open("https://localhost:" + serverPort);
  }
});

var roomList = {};

var broadcasterIds = [];

function socketIdsInRoom(name) {
  var socketIds = io.nsps["/"].adapter.rooms[name];
  console.log("socketIds", socketIds);
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    return [];
  }
}

setInterval(()=>{
  console.log('ROOM LIST', roomList)
}, 3000)

function getObjectKeyFrom(obj, value){
  Object.keys(obj).forEach(function(key){
    if(obj[key] = value){
      return key
    }
  })
  return 
} 

io.on("connection", function(socket) {
  console.log("connection");

  io.emit('roomList', roomList)
  
  socket.on("disconnect", function() {
    console.log("disconnect");
    if (socket.room) {
      var isBroadcaster = _.includes(broadcasterIds,socket.id) ? true : false;

      if(isBroadcaster){
        console.log('Broadcaster disconnect')
        var deteleIndex = broadcasterIds.indexOf(socket.id)
        broadcasterIds.splice(deteleIndex,1)
        delete roomList[socket.id]
        io.emit('roomList', roomList)
      }

      var room = socket.room;
      io.to(room).emit("leave", socket.id, isBroadcaster);
      socket.leave(room);
    }
  })

  //## return only broadcastId
  socket.on("join", function(name, isBroadcaster, callback) {
    console.log("join", socket.id);

    //get broadcastId in the room by name
    if(!isBroadcaster){
      var broadcastId = socketIdsInRoom(name).filter(function(item) {
       return _.includes(broadcasterIds, item);
      });
      callback(broadcastId); //send broadcastId to client
    } else {
      callback(null)
    }
    

    socket.join(name);
    socket.room = name;

    if (isBroadcaster) {
      //Check name duplicate
      var key = getObjectKeyFrom(roomList, socket.room)
      if(key){
        var index = broadcasterIds.indexOf(socket.room)
        broadcasterIds.splice(index,1)
        delete roomList[key]
      }
      //Add new name
      broadcasterIds.push(socket.id);
      roomList[socket.id] = socket.room;    
      io.emit('roomList', roomList);
    }
  });

  socket.on("exchange", function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit("exchange", data);
  });

});
