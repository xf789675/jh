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
var queryTable = 0;
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '车辆管理' });
});

router.get('/listVehicle', function(req, res, next) {
	var vehicleList;
	pool.getConnection(function(err, connection) {
		connection.query('SELECT s.vehicle from status s', function (error, vehicles, fields) {
			connection.release();
			if (error) throw error;
			vehicleList = vehicles;

			for(var i = 0; i < vehicleList.length; i++) {
				pool.getConnection(function(err, connection) {
					connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
			    	'where h1.gpstime  < curtime() and h.vehicle = ? limit 1 ', [vehicleList[i].vehicle], function (error, results, fields) {
			      connection.release();
			      if (error) throw error;
			      
			      console.log(results);
			      vehicleList[i].lat = results[0].lat;
			      vehicleList[i].lng = results[0].lng;
			      vehicleList[i].gpstime = results[0].gpstime;
			      vehicleList[i].veo = results[0].veo;
			    });
				});
			}
			res.json({
				status: 200,
				data: vehicleList,
			})    
		});
		
  });
});

// router.get('/listVehicle', function(req, res, next) {
// 	pool.getConnection(function(err, connection) {

//     connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
//     	'join (select s.vehicle as vehicle, max(h1.gpstime) as gpstime from status s join history1 h1 on s.vehicle = h1.vehicle where h1.gpstime  < curtime() group by h1.vehicle) t on h.gpstime = t.gpstime ', function (error, results, fields) {
//       connection.release();
//       if (error) throw error;
      
//       res.json({
//         status: 200,
//         data: results
//       });
//     });
//   });
// });

router.get('/track/:vehicle', function(req, res, next) {
	var vehicle = req.params.vehicle;
	res.render('track', {title: vehicle});
})

router.get('/showHistory/:vehicle', function(req, res, next) {
	var vehicle = req.params.vehicle;
	console.log(queryTable);
	pool.getConnection(function(err, connection) {
    connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history' + (queryTable + 1) + ' h ' +
    	'where h.vehicle=?', [vehicle], function (error, results, fields) {
      connection.release();
      if (error) throw error;
      queryTable = (queryTable + 1) % 2;
      res.json({
        status: 200,
        data: results
      });
    });
  });
});
module.exports = router;
