var cluster = require('cluster');
var expressCluster = require('express-cluster');
var app = require('./app');
var cores = require('os').cpus().length;
var minimumInstances = 16;

var instances = +process.env.POINTR_INSTANCES || Math.max(minimumInstances, cores);
if (cluster.isMaster) {
	console.log('Starting pointr. Spawning ' + instances + ' instances...');
}

expressCluster(app, { count: instances });