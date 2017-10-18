var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : '122.193.237.30',
  port			  : 33060,
  user            : 'jh',
  password        : 'jh2017',
  database        : 'history'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/listVehicle', function(req, res, next) {
	pool.getConnection(function(err, connection) {
    connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
    	'join (select s.vehicle as vehicle, max(h1.gpstime) as gpstime from status s join history1 h1 on s.vehicle = h1.vehicle where h1.gpstime  < curtime() group by h1.vehicle) t on h.gpstime = t.gpstime ', function (error, results, fields) {
      connection.release();
      if (error) throw error;
      
      res.json({
        status: 200,
        data: results
      });
    });
  });
});
module.exports = router;
