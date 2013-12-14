//jslint node: true

/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var rdb = require('rethinkdb');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/q/:name', routes.q);

var dbConfig = {
  host : process.env.RDB_HOST || 'localhost',
  port : parseInt(process.env.RDB_PORT) || 28015,
  db   : process.env.RDB_DB || 'rethink_miner'
};  

module.exports = app;

process.on('uncaughtException', function (err) {
  console.log(err);
  console.log(err.stack);
});

// Using a single db connection for the app
rdb.connect({host: dbConfig.host, port: dbConfig.port}, function(err, connection) {
  if(err) {
    console.log("ERROR connecting to database: %s:%s", err.name, err.msg);
    process.exit(1);
  }
  else {
    routes.setupDB(connection);
    // set up the default database for the connection
    connection.use(dbConfig.db);
    // set up the module global connection
    routes.connection = connection;
    app.set('db', connection);
  }
});

if (!module.parent) {
  // start serving requests
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Server listening on port ' + app.get('port'));
  });
}
