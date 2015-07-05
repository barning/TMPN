#!/usr/bin/env node


/* Express 3 requires that you instantiate a `http.Server` to attach socket.io to first */
var app = require('express')(),
server = require('http').createServer(app),
io = require('socket.io').listen(server),
port = 64782,
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

var wasIntro = false;

// Array for Quests
var myQuests = [
  'Springt im Kreis',
  'Lacht euch laut an',
  'Wedelt mit den Armen',
  'Grüßt andere Leute',
  'Tut so als könntet ihr fliegen',
  'Ruft euren Namen',
  'Schmeißt die Fuffies durch den Club und schreit: BO, BO!',
  'Fasst euch an den Kopf',
  'Schüttelt euch die Hände',
  'Dreht euch im Kreis',
  'Zählt laut bis 5',
  'Stampft mit den Füßen',
  'Gebt euch einen High-Five',
  'Macht den Ententanz',
  'Muht wie eine Kuh'
]

var playersReady = false;

// This is a Player
function Player(socket) {
  this.socket = socket;
  this.score = 0;
  this.state = 'ready';
}

//Socket.io emits this event when a connection is made.
io.sockets.on('connection', function (socket) {

  function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }
  var sendAllPlayers = function(command, data) {
    for (var i = 0; i < players.length; i++) {
      players[i].socket.emit(command, data);
    }
  }
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
    transmitter();
  });

  // Emit a message to send it to the client.
  socket.emit('ping', { msg: 'Willkommen zu diesem WiFi' });

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

  // Print messages from the client.
  socket.on('pong', function (data) {
    //console.log(data.msg);
    transmitter();
  });

  // Players say they are ready
  socket.on('theyAreReady', function (data) {
    playersReady = true;
    sendAllPlayers('receiver', { msg: 'Super, ihr seid bereit!',showbutton:0 });
    sleep(5000);
    transmitter();
  });

  // The Message Transmitter
  var transmitter = function(){
    var playerNumber = players.length;

    if (playerNumber < 2 && !playersReady) {
      sendAllPlayers('receiver', { msg: 'Suche dir mindestens zwei Partner,<br> die mit diesem WiFi verbunden sein müssen.',showbutton:0 });
    }
    else if (!wasIntro) {
      sendAllPlayers('receiver', { msg: 'Ihr seid '+playerNumber+" Personen in diesem WiFi. <br> Seid ihr bereit?",showbutton:1});
    }

    if (playersReady) {
      if (!wasIntro){
        sendAllPlayers('receiver', { msg: 'Ihr bekommt jetzt Aufgaben.'});
        sleep(10000);
        sendAllPlayers('receiver', { msg: 'Löst sie für ein kommunikatives Erlebnis!'});
        sleep(10000);
      }
      sendAllPlayers('receiver', { msg: 'Schüttelt euch die Hände'});
      sleep(8000);
      quest();
    }
  }

  function reset(){
    sendAllPlayers('receiver', { msg: 'Danke fürs Spielen'});
    sleep(10000);
    playersReady = false;
    wasIntro = false;
    sendAllPlayers('receiver', { showbutton:1 });
    transmitter();
  }

  // Quest Loop
  function questLoop (i) {
    setTimeout(function () {
      var q = Math.floor((Math.random() * myQuests.length));
      sendAllPlayers('receiver', { msg: myQuests[q]});
      if (--i) {
        questLoop(i);
      }
      else {
        reset();
      }
    }, 8000);
  }

  // Quest Generator
  function quest(){
    wasIntro = true;
    questLoop(10);
  }

});
