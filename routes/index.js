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
	var endDate = req.body.endDate;
  var cycleStart, cycle, start;
  var resultJson = {};
	// console.log(queryTable);
  console.log('++++++++++++' + vehicle + '++++++++++++++');
	pool.getConnection(function(err, connection) {
    
    var query = connection.query('SELECT mod(datediff(now(), s.start), s.cycle) as cycleno, s.cycle, s.start from newstatus s where s.vehicle=?', [vehicle]);
    query
      .on('error', function(error) {
        throw error;
      })
      .on('result', function(row) {
        connection.pause();
        cycleStart = row.cycleno;
        cycle = row.cycle;
        start = row.start;
        console.log('cycleStart is: ' + cycleStart);
        connection.resume();
      })
      .on('end', function() {
        connection.release();
        var cycleLeft = 0;
        var repeatNum = 0;
        var repeatLeft = 0;
        var isOverloop = false;
        if (startDate && startDate != '') {
          var startRange = moment.duration(moment(startDate) - moment(start)).days();
          cycleStart = startRange % cycle;
          console.log(cycleStart);
          var searchRange = moment.duration(moment(endDate) - moment(startDate)).days();
          cycleLeft = cycle - cycleStart - 1;
          console.log('searchRange: ' + searchRange);
          console.log('cycleLeft: ' + cycleLeft);
          if (searchRange > cycleLeft) {
            isOverloop = true;
            repeatNum = parseInt((searchRange + 1 - (cycle - cycleStart)) / cycle);
            // repeatLeft = (searchRange - (cycle - cycleStart)) % cycle;
            repeatLeft = (moment.duration(moment(endDate) - moment(start)).days() + 1) % cycle;
          }
          console.log('repeatNum: ' + repeatNum);
          console.log('repeatLeft: ' + repeatLeft);
        }
        pool.getConnection(function(err, conn1) {
          var query1 = conn1.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
            'where h.vehicle=? and h.cycleno<? order by h.cycleno, h.gpstime', [vehicle, cycleStart]);
          query1
            .on('error', function (eror) {
              throw error;
            })
            .on('result', function (row) {
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
              if (before) {
                cyclenoDatas = before[row.cycleno];
              } else {
                before = {};
                resultJson['before'] = before;
              }
              if (!cyclenoDatas) {
                cyclenoDatas = new Array();
                before[row.cycleno] = cyclenoDatas;
              }
              cyclenoDatas.push(point);

              conn1.resume();
            })
            .on('end', function () {
              conn1.release();

              pool.getConnection(function(err, conn2) {
                var query2 = conn2.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
                  'where h.vehicle=? and h.cycleno=? order by h.cycleno, h.gpstime', [vehicle, cycleStart]);
                query2
                  .on('error', function (error) {
                    throw error;
                  })
                  .on('result', function (row) {
                    conn2.pause();

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

                    var current = resultJson['current'];
                    var cyclenoDatas = null;
                    if (current) {
                      cyclenoDatas = current[row.cycleno];
                    } else {
                      current = {};
                      resultJson['current'] = current;
                    }
                    if (!cyclenoDatas) {
                      cyclenoDatas = new Array();
                      current[row.cycleno] = cyclenoDatas;
                    }
                    cyclenoDatas.push(point);

                    conn2.resume();
                  })
                  .on('end', function () {
                    conn2.release();
                    pool.getConnection(function(err, conn3) {
                      var query3 = conn3.query('SELECT distinct h.vehicle, h.lat, h.lng, h.gpstime, h.veo, h.cycleno from newhis h ' +
                        'where h.vehicle=? and h.cycleno>? order by h.cycleno, h.gpstime', [vehicle, cycleStart]);
                      query3
                        .on('error', function (error) {
                          throw error;
                        })
                        .on('result', function (row) {
                          conn3.pause();

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

                          var after = resultJson['after'];
                          var cyclenoDatas = null;
                          if (after) {
                            cyclenoDatas = after[row.cycleno];
                          } else {
                            after = {};
                            resultJson['after'] = after;
                          }
                          if (!cyclenoDatas) {
                            cyclenoDatas = new Array();
                            after[row.cycleno] = cyclenoDatas;
                          }
                          cyclenoDatas.push(point);

                          conn3.resume();
                        })
                        .on('end', function () {
                          conn3.release();
                          var points = [];
                          if(!isOverloop) {
                            if (!startDate) {
                              var before = resultJson['before'];
                              for (var i = 0; i < cycleStart; i++) {
                                var date = moment(endDate).subtract(cycleStart - i, 'days').format('YYYY-MM-DD');
                                points.push({
                                  date: date,
                                  data: before[i],
                                });
                              }
                              var current = resultJson['current'];
                              points.push({
                                date: moment(endDate).format('YYYY-MM-DD'),
                                data: current[cycleStart],
                              });
                            } else {
                              var current = resultJson['current'];
                              points.push({
                                date: moment(startDate).format('YYYY-MM-DD'),
                                data: current[cycleStart],
                              });
                              var after = resultJson['after'];
                              for (var i = cycleStart + 1, j=1; i < cycle; i++) {
                                var date = moment(startDate).add(j++, 'days');
                                if(date > moment(endDate)) {
                                  break;
                                }
                                points.push({
                                  date: moment(date).format('YYYY-MM-DD'),
                                  data: after[i],
                                });
                              }
                            }
                          } else {
                            var iterator = true;
                            var before = resultJson['before'];
                            var current = resultJson['current'];
                            points.push({
                              date: moment(startDate).format('YYYY-MM-DD'),
                              data: current[cycleStart],
                            });
                            var after = resultJson['after'];
                            var j=1;
                            for (var i = cycleStart + 1; i < cycle; i++) {
                              var date = moment(startDate).add(j++, 'days');
                              points.push({
                                date: moment(date).format('YYYY-MM-DD'),
                                data: after[i],
                              });
                            }
                            for(var k=0; k < repeatNum; k++) {
                              for (var i = 0; i < cycleStart; i++) {
                                var date = moment(startDate).add(j++, 'days').format('YYYY-MM-DD');
                                points.push({
                                  date: date,
                                  data: before[i],
                                });
                              }
                              points.push({
                                date: moment(startDate).add(j++, 'days').format('YYYY-MM-DD'),
                                data: current[cycleStart],
                              });
                              for (var i = cycleStart + 1; i < cycle; i++) {
                                var date = moment(startDate).add(j++, 'days');
                                points.push({
                                  date: moment(date).format('YYYY-MM-DD'),
                                  data: after[i],
                                });
                              }
                            }

                            if(before) {
                              for(var i=0; i < repeatLeft; i++) {
                                if(before[i]) {
                                  var date = moment(startDate).add(j++, 'days').format('YYYY-MM-DD');
                                  points.push({
                                    date: date,
                                    data: before[i],
                                  });
                                }
                              }
                            }

                            if(repeatLeft > cycleStart) {
                              points.push({
                                date: moment(startDate).add(j++, 'days').format('YYYY-MM-DD'),
                                data: current[cycleStart],
                              });
                            }

                            if(repeatLeft > cycleStart + 1) {
                              for (var i = cycleStart + 1; i < repeatLeft - 1; i++) {
                                if(after[i]) {
                                  var date = moment(startDate).add(j++, 'days');
                                  points.push({
                                    date: moment(date).format('YYYY-MM-DD'),
                                    data: after[i],
                                  });
                                }
                              }
                            }


                          }
                          res.json({
                            data: points
                          });
                        });
                    });
                  });
              });
            });

        });
      })
    });
});
module.exports = router;
