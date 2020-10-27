'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message, room, toId, senderId) {
    log('Client said: ', message, room, toId, senderId);
    io.to(toId).emit('message', message, room, senderId);
  });

  socket.on('send candidate', function(message, room, senderId) {
    log('Client said: Candidate ', message, room, senderId);
    socket.to(room).emit('receive candidate', message, senderId);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else {
      log('Client ID ' + socket.id + ' joined room ' + room);
      socket.join(room);

      socket.emit('joined', room, socket.id, Object.keys(clientsInRoom.sockets));

      // Create connection
      socket.to(room).emit('ready', socket.id);

    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`Peer or server disconnected. Reason: ${reason}.`);
    socket.broadcast.emit('bye', socket.id);
  });

  socket.on('bye', function(socketId) {
    console.log(`Peer said bye from ${socketId}.`);
  });
});
