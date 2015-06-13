var cluster = require('cluster');
var expressCluster = require('express-cluster');
var app = require('./app');
var config = require('./lib/config');

// Determine the number of instances to run.
var cores = require('os').cpus().length;
var instancesMin = (config.instances && config.instances.min) || 16;
var instancesMax = (config.instances && config.instances.max) || 128;
var instances = Math.max(instancesMin, Math.min(instancesMax, cores));

// Start clustered instances.
if (cluster.isMaster) {
	console.log('Starting pointr. Spawning ' + instances + ' instances...');
}
expressCluster(app, { count: instances });