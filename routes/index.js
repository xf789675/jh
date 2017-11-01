var express = require('express');
var router = express.Router();
var moment = require('moment');
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

router.post('/showHistory', function(req, res, next) {
	var vehicle = req.body.vehicle;
	var startDate = req.body.startDate;
	var endDate = req.body.endDate
  var cycleStart, cycle;
  var resultJson = {};
	// console.log(queryTable);
	pool.getConnection(function(err, connection) {
    
    var query = connection.query('SELECT mod(datediff(now(), s.start), s.cycle) as cycleno, s.cycle from newstatus s where s.vehicle=?', [vehicle]);
    query
      .on('error', function(error) {
        throw error;
      })
      .on('result', function(row) {
        connection.pause();
        cycleStart = row.cycleno;
        cycle = row.cycle;
        connection.resume();
      })
      .on('end', function() {
        connection.release();
        if (startDate && startDate != '') {
          var startRange = moment.duration(moment() - moment(startDate)).days();
          cycleStart = startRange % cycle;
          var searchRange = moment.duration(moment(endDate) - moment(startDate)).days();
          var cycleLeft = cycle - cycleStart;
          var repeatNum = 0;
          var repeatLeft = 0;
          if(searchRange > cycleLeft) {
            repeatNum = (searchRange - (cycle - cycleStart)) / cycle + 1;
            repeatLeft = (searchRange - (cycle - cycleStart)) % cycle;
          };

          pool.getConnection(function(err, conn1) {
            var query1 = conn1.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
              'where h.vehicle=? and h.cycleno<? order by h.cycleno, h.gpstime', [vehicle, cycleno]);
          query1
            .on('error', function(eror) {
              throw error;
            })
            .on('result', function(row) {
              conn1.pause();

              var r_vehicle = row.vehicle;
              var r_lat = row.lat;
              var r_lng = row.lng;
              var r_gpstime = row.gpstime;
              var r_veo = row.veo;
              var r_cycleno = row.cycleno;

              var point = {
                vehicle: row.vehicle,
                lat: row.lat,
                lng: row.lng,
                gpstime: row.gpstime,
                veo: row.veo,
                cycleno: row.cycleno,
              };

              var before = resultJson['before'];
              var cyclenoDatas = null;
              if(before) {
                cyclenoDatas = before[row.cycleno];
              } else {
                before = {};
                resultJson['before'] = before;
              }
              if(!cyclenoDatas) {
                cyclenoDatas = new Array();
                before[row.cycleno] = cyclenoDatas;
              }
              cyclenoDatas.push(point);

              conn1.resume();
            })
            .on('end', function() {
              conn1.release();
            })

          pool.getConnection(function(err, conn) {
            var query2 = conn.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
              'where h.vehicle=? and h.cycleno=? order by h.cycleno, h.gpstime', [vehicle, cycleno]);

          pool.getConnection(function(err, conn) {
            var query3 = conn.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
              'where h.vehicle=? and h.cycleno>? order by h.cycleno, h.gpstime', [vehicle, cycleno]);
            , function (error, results, fields) {
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

        }
      })
    });
    
    connection.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h' + 
    	'where h.vehicle=? order by h.cycleno, h.gpstime', [vehicle], function (error, results, fields) {
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
