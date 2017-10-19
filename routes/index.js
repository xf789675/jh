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
//
// router.get('/listVehicle', function(req, res, next) {
// 	var data = [];
// 	pool.getConnection(function(err, connection) {
// 		connection.query('SELECT s.vehicle from status s', function (error, vehicles, fields) {
// 			connection.release();
// 			if (error) throw error;
// 			var vehicleList = vehicles;
//
//
// 			for(var i = 0; i < vehicleList.length; i++) {
// 				var vehicle = vehicleList[i]['vehicle'];
// 				console.log(vehicle);
// 				pool.getConnection(function(err, connection) {
// 					connection.query('SELECT h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
// 			    	'where h.gpstime  < curtime() and h.vehicle = ? limit 1 ', [vehicle], function (error, results, fields) {
// 			      connection.release();
// 			      if (error) throw error;
//
// 			      console.log(results);
// 			      var item = {};
// 			      item.lat = results[0].lat;
// 			      item.lng = results[0].lng;
// 			      item.veo = results[0].veo;
// 			      item.gpstime = results[0].gpstime;
// 			      data.push(item);
//
// 			      if(i == (vehicleList.length - 1)) {
//               res.json({
//                 status: 200,
//                 data: data,
//               });
// 						}
// 			    });
// 				});
// 			}
// 		});
//
//   });
// });

router.get('/listVehicle', function(req, res, next) {
  var data = [];
  pool.getConnection(function(err, connection) {
    var query = connection.query('SELECT s.vehicle from status s');
    query
      .on('error', function(err) {
        // Handle error, an 'end' event will be emitted after this as well
        throw err;
      })
      .on('result', function(row) {
        // Pausing the connnection is useful if your processing involves I/O
        connection.pause();
        console.log(row);
        var vehicle = row.vehicle;
        pool.getConnection(function(err, conn) {
          conn.query('SELECT h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
            'where h.gpstime  < curtime() and h.vehicle = ? order by h.gpstime desc limit 1 ', [vehicle], function (error, results, fields) {
            conn.release();
            if (error) throw error;

            console.log(results);
            var item = {};
            item.lat = results[0].lat;
            item.lng = results[0].lng;
            item.veo = results[0].veo;
            item.gpstime = results[0].gpstime;
            item.vehicle = vehicle;
            data.push(item);

            connection.resume();
          });
        });
      })
      .on('end', function() {
        // all rows have been received
        console.log('query end');
        connection.release();
        res.json({
          status: 200,
          data: data,
        });
      });
    // , function (error, vehicles, fields) {
    //   connection.release();
    //   if (error) throw error;
    //   var vehicleList = vehicles;
    //
    //
    //   for(var i = 0; i < vehicleList.length; i++) {
    //     var vehicle = vehicleList[i]['vehicle'];
    //     console.log(vehicle);
    //     pool.getConnection(function(err, connection) {
    //       connection.query('SELECT h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history1 h ' +
    //         'where h.gpstime  < curtime() and h.vehicle = ? limit 1 ', [vehicle], function (error, results, fields) {
    //         connection.release();
    //         if (error) throw error;
    //
    //         console.log(results);
    //         var item = {};
    //         item.lat = results[0].lat;
    //         item.lng = results[0].lng;
    //         item.veo = results[0].veo;
    //         item.gpstime = results[0].gpstime;
    //         data.push(item);
    //
    //         if(i == (vehicleList.length - 1)) {
    //           res.json({
    //             status: 200,
    //             data: data,
    //           });
    //         }
    //       });
    //     });
    //   }
    // });

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
