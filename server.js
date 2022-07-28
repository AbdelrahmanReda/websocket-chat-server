const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
const mongo = require('mongodb').MongoClient;


// Spinning the http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);
console.log('listening on port 8000');


const wsServer = new webSocketServer({
    httpServer: server
});

const clients = {};

// This code generates unique userid for everyuser.
const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

wsServer.on('request', function (request) {
    var userID = getUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    // You can rewrite this part of the code to accept only the requests from allowed origin
    const connection = request.accept(null, request.origin);
    clients[userID] = connection;
    mongo.connect('mongodb://127.0.0.1:27017', function (err, db) {
        if (err) {
            throw err;
        }
        const dbo = db.db("chatroom");
        for (key in clients) {
            dbo.collection('chatconv').find().toArray(function (err, result) {
                if (err) throw err;
                clients[key].send(JSON.stringify(result));
            });
        }
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                const messageBody =  JSON.parse(message['utf8Data'])

                const instance = {
                    name: messageBody.name,
                    message: messageBody.message,
                    timeStamp:new Date()
                }
                console.log(instance)
                dbo.collection('chatconv').insertOne(instance, function(error,result){
                    if (error)
                        throw  error
                    // broadcasting message to all connected clients
                });
                dbo.collection('chatconv').find().toArray(function (err, result) {
                    if (err) throw err;
                    for (key in clients) {
                        clients[key].send(JSON.stringify(result));
                    }
                });
            }
        })
    })
});
