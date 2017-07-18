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

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/client", function(req, res) {
  res.sendFile(__dirname + "/client.html");
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

io.on("connection", function(socket) {
  console.log("connection");

  socket.on("disconnect", function() {
    console.log("disconnect");
    if (socket.room) {
      var isBroadcaster = _.includes(broadcasterIds,socket.id) ? true : false;

      var room = socket.room;
      io.to(room).emit("leave", socket.id, isBroadcaster);
      socket.leave(room);
    }
  });

  //return only broadcastId
  socket.on("join", function(name, isBroadcaster, callback) {
    console.log("join", socket.id);

    var broadcastId = socketIdsInRoom(name).filter(function(item) {
      return _.includes(broadcasterIds, item);
    });
    
    if (isBroadcaster) {
      broadcasterIds.push(socket.id);
    }
    console.log('BROADCAST ID', broadcastId)
    callback(broadcastId);
    socket.join(name);
    socket.room = name;
  });

  socket.on("exchange", function(data) {
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit("exchange", data);
  });
});
