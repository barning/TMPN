#!/usr/bin/env node


/* Express 3 requires that you instantiate a `http.Server` to attach socket.io to first */
var app = require('express')(),
server = require('http').createServer(app),
io = require('socket.io').listen(server),
port = 8080,
url  = 'http://localhost:' + port + '/';
/* We can access nodejitsu enviroment variables from process.env */
/* Note: the SUBDOMAIN variable will always be defined for a nodejitsu app */
if(process.env.SUBDOMAIN){
  url = 'http://' + process.env.SUBDOMAIN + '.jit.su/';
}

server.listen(port);
console.log("Express server listening on port " + port);
console.log(url);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Arrays for Connections
var connections = [];
var players = [];

// This is a Player
function Player(socket) {
  this.socket = socket;
  this.score = 0;
  this.state = 'ready';
}

//Socket.io emits this event when a connection is made.
io.sockets.on('connection', function (socket) {


  var removePlayerBySocketId = function(id) {
    var pNr = getPlayerNrById(id);
    if (pNr !== undefined) {
      var player = players[pNr];
      players.splice(pNr,1);
      console.log('Player "' + player.name + '" was removed.');
    }
  }

  var removeConnectionById = function(id) {
    var sNr = getSocketNrById(id);
    if (sNr !== undefined) {
      connections.splice(sNr,1);
      console.log('Connection "' + id + '" was removed.');
    }
  }

  var getPlayerBySocket = function(socket) {
    if (socket === undefined) return undefined;
    return players[getPlayerNrById(socket.id)];
  }

  var getPlayerNameBySocket = function(socket) {
    var pl = getPlayerBySocket(socket);
    if (pl !== undefined) return pl.name;
  }

  var getPlayerNrById = function(id) {
    console.log("getPlayerNrById(" + id + ")")
    for (var i = 0; i < players.length; i++) {
      if(id == players[i].socket.id) {
        return i;
      }
    }
  }

  var getSocketNrById = function(id) {
    for (var i = 0; i < connections.length; i++) {
      if(id == connections[i].id) {
        return i;
      }
    }
  }

  var getSocketById = function(id) {
    return connections[getSocketNrById(id)];
  }

  // Push the Socket to the Connection List
  connections.push(socket);

  socket.on('disconnect', function () {
    removePlayerBySocketId(socket.id);
    removeConnectionById(socket.id);
    console.log("disconnect " + socket.id );
    console.log("I see "+connections.length+" connections and");
    console.log(players.length+" Player/s");
  });

  // Emit a message to send it to the client.
  socket.emit('ping', { msg: 'Willkommen zu diesem WiFi' });

  // Print messages from the client.
  socket.on('pong', function (data) {
    console.log(data.msg);
  });
  // register players, if the player is not already registered
  socket.on('register', function (data) {
    var player = getPlayerBySocket(socket);
    if (player === undefined) {
      player = new Player(socket)
      players.push(player);
      console.log("socket " + player.socket.id)
    } else {
      console.log("player is already registered with socket " + player.socket.id)
    }
    console.log("I see "+connections.length+" connections and");
    console.log(players.length+" Player/s");
  });

});