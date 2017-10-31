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
  var data = [];
  pool.getConnection(function(err, connection) {
    var query = connection.query('SELECT s.vehicle, mod(datediff(now(), s.start), s.cycle) as cycleno from newstatus s order by s.vehicle');
    query
      .on('error', function(err) {
        // Handle error, an 'end' event will be emitted after this as well
        throw err;
      })
      .on('result', function(row) {
        // Pausing the connnection is useful if your processing involves I/O
        connection.pause();
        // console.log(row);
        var vehicle = row.vehicle;
        var cycleno = row.cycleno;
        pool.getConnection(function(err, conn) {
          conn.query('SELECT h.vehicle, h.lat, h.lng, h.gpstime, h.veo from newhis h ' +
            'where h.gpstime  < curtime() and h.vehicle = ? and h.cycleno = ? order by h.gpstime desc limit 1 ', [vehicle, cycleno], function (error, results, fields) {
            conn.release();
            if (error) throw error;
            if(results.length > 0) {
              // console.log(results);
              var item = {};
              item.lat = results[0].lat;
              item.lng = results[0].lng;
              item.veo = results[0].veo;
              item.gpstime = results[0].gpstime;
              item.vehicle = vehicle;
              data.push(item);
            }
            connection.resume();

          });
        });
      })
      .on('end', function() {
        // all rows have been received
        // console.log('query end');
        connection.release();
        res.json({
          status: 200,
          data: data,
        });
      });

  });
});

router.get('/track/:vehicle', function(req, res, next) {
	var vehicle = req.params.vehicle;
	res.render('track', {title: vehicle});
})

router.get('/showHistory/:vehicle', function(req, res, next) {
	var vehicle = req.params.vehicle;
	// console.log(queryTable);
	pool.getConnection(function(err, connection) {
    connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo from history' + (queryTable + 1) + ' h ' +
    	'where h.vehicle=? order by gpstime', [vehicle], function (error, results, fields) {
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
