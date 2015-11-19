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
app.get('/assets/css/materialize.css', function (req, res) {
  res.sendfile(__dirname + '/assets/css/materialize.css');
});
app.get('/assets/font/roboto/Roboto-Regular.woff', function (req, res) {
  res.sendfile(__dirname + '/assets/font/roboto/Roboto-Regular.woff');
});
app.get('/assets/font/roboto/Roboto-Regular.ttf', function (req, res) {
  res.sendfile(__dirname + '/assets/font/roboto/Roboto-Regular.ttf');
});

app.get('/assets/interagieren.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/interagieren.gif');
});
app.get('/assets/kniebeuge.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/kniebeuge.gif');
});
app.get('/assets/laufen.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/laufen.gif');
});
app.get('/assets/sprechen.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/sprechen.gif');
});
app.get('/assets/springen.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/springen.gif');
});
app.get('/assets/winken.gif', function (req, res) {
  res.sendfile(__dirname + '/assets/winken.gif');
});

// Arrays for Connections
var connections = [];
var players = [];

var wasIntro = false;

// Array for Quests

var jumpingQuests = [
  'Springt im Kreis',
  'Springt nach vorne',
  'Springt zurück',
  'Springt zur Seite'
];
var runningQuests = [
  'Lauft im Kreis',
  'Geht zwei Schritte vor',
  'Geht zwei Schritte zurück',
  'Macht einen Schritt zur Seite'
];
var noiseQuests = [
  'Lacht euch laut an',
  'Grüßt andere Leute',
  'Ruft euren Namen',
  'Muht wie eine Kuh'
];
var sportQuests = [
  'Wedelt mit den Armen',
  'Macht einen Sit-Up',
  'Dreht euch im Kreis',
  'Stampft mit den Füßen',
];
var interactionQuests = [
  'Fasst euch an den Kopf',
  'Schüttelt euch die Hände',
  'Zählt laut bis 5',
  'Gebt euch einen High-Five',
];

var myQuests = [interactionQuests,sportQuests,runningQuests,noiseQuests,jumpingQuests]

var playersReady = false;

// This is a Player
function Player(socket) {
  this.socket = socket;
  this.score = 0;
  this.state = 'ready';
}

//Socket.io emits this event when a connection is made.
io.sockets.on('connection', function (socket) {

  function getImages(imageDir, callback) {
    var fileType = '.gif',
        files = [], i;
    fs.readdir(imageDir, function (err, list) {
        for(i=0; i<list.length; i++) {
            if(path.extname(list[i]) === fileType) {
                files.push(list[i]); //store the file name into the array files
            }
        }
        callback(err, files);
    });
}

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
    sendAllPlayers('receiver', { msg: 'Super, ihr seid bereit!<br><br>Ihr bekommt jetzt Aufgaben.<br><br>Löst sie für ein kommunikatives Erlebnis.',showbutton:0 });
    sleep(20000);
    transmitter();
  });

  // The Message Transmitter
  var transmitter = function(){
    var playerNumber = players.length;

    if (playerNumber < 3 && !playersReady) {
      sendAllPlayers('receiver', { msg: 'Suche dir mindestens zwei Partner,<br> die mit diesem WiFi verbunden sein müssen.',showbutton:0,img: 0 });
    }
    else if (!wasIntro) {
      sendAllPlayers('receiver', { msg: 'Ihr seid '+playerNumber+" Personen in diesem WiFi. <br> Seid ihr bereit?",showbutton:1,img: 0});
    }

    if (playersReady) {
      // if (!wasIntro){
      //   sendAllPlayers('receiver', { msg: 'Ihr bekommt jetzt Aufgaben.',img: 0});
      //   sleep(20000);
      //   sendAllPlayers('receiver', { msg: 'Löst sie für ein kommunikatives Erlebnis!',img: 0});
      //   sleep(20000);
      // }
      sendAllPlayers('receiver', { msg: 'Schüttelt euch die Hände',img: 0});
      sleep(8000);
      quest();
    }
  }

  function reset(){
    sendAllPlayers('receiver', { msg: 'Danke fürs Spielen',img: 0});
    sleep(50000);
    playersReady = false;
    wasIntro = false;
    sendAllPlayers('receiver', { showbutton:1 });
    transmitter();
  }

  // Quest Loop
  function questLoop (i) {
    setTimeout(function () {
      var q = Math.floor((Math.random() * myQuests.length));
      var r = myQuests[q];
      sendAllPlayers('receiver', { msg: r[Math.floor((Math.random() * r.length))], img:q});
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
    questLoop(5);
  }

});
