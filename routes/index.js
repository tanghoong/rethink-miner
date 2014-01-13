var r = require('rethinkdb'),
    debug = require('debug')('rdb'),
    csv = require('express-csv'),
    async = require('async'),
    db = require('../lib/db'),
    queries = require('../lib/query');

/*
 * GET home page.
 */

exports.index = function(req, res) {
  res.locals.query_active = true;
  queries.queriesList()
    .then(function (results) {
      res.render('index', {title: 'Known Queries', res: results});
    })
    .catch(function (err) {
      res.status(500);
      return res.render('error', {title: 'Failed to list known queries', err: err});
    })
    .done();
}

function displayTableHtml(res, params, response) {
  res.render('query', response);
}

function displayTableMethod(res, params, response, method, suffix) {
  answer = [response.result.headers].concat(response.result.res);
  res.attachment(params.name + '.' + suffix);
  method.call(res, answer);
}

function displayTableCsv(res, params, response) {
  displayTableMethod(res, params, response, res.csv, 'csv');
}

function displayTableJsonp(res, params, response) {
  displayTableMethod(res, params, response, res.jsonp, 'jsonp');
}

function queryParams(req) {
  params = {};

  if (req === null) {
    // No user supplied params, just defaults
    params.page_num = 0;
    params.page_size = 100;
    params.display = displayTableHtml;
    params.order_by = null;
    params.force_uptodate = false;
    params.name = 'unknown';
  } else {
    // Use user supplied params
    if (req.query.format == 'csv') {
      // Override params for CSV, just get everything out
      params.page_num = 0;
      params.page_size = 1000000;
      params.display = displayTableCsv;
    } else if (req.query.jsonp == 'jsonp') {
      params.page_num = 0;
      params.page_size = 1000000;
      params.display = displayTableJsonp;
    } else {
      params.page_size = parseInt(req.query.page_size) || 100;
      params.page_num = parseInt(req.query.page_num) || 0;
      params.display = displayTableHtml;
    }
    params.order_by = req.query.order;
    params.force_uptodate = req.query.uptodate || false;
    params.name = req.params.name;
  }

  return params;
}

function displayTable(query, params, res) {
  query
    .then(function (q) {
      return q.pageData(params);
    })
    .catch(function (err) {
      res.status(500);
      return res.render('error', {title: 'Failed to get query setup', err: err});
    })
    .then(function (response) {
      params.display(res, params, response);
    })
    .catch(function (err) {
      res.status(500);
      return res.render('error', {title: 'Failed to get data to display table', err: err});
    })
    .done();
}

exports.q = function(req, res) {
  params = queryParams(req);
  query = queries.namedQuery(req.params.name);
  res.locals.query_active = true;
  displayTable(query, params, res);
}

exports.addShow = function (req, res) {
  res.locals.add_active = true;
  res.render('add', {result: {name: ''}});
}

function addSave(name, query, fields, res) {
  queries.namedQueryNew(name, query, fields)
  .then(function (q) {
    return q.save();
  }).done(function(result) {
    msg = 'Saved';
    if (result.inserted == 0) {
      msg = 'Failed to save for:' + result.first_error;
    }

    return res.render('add', {name: name, query: query, fields: fields, msg: msg});
  }, function(err) {
    res.render('add', {name: name, query: query, fields: fields, msg: 'Error while saving:' + err})
  });
}

function addTest(name, query, fields, res) {
  queries.namedQueryNew(name, query, fields)
  .then(function (q) {
    params = queryParams(null);
    return q.pageData(params);
  })
  .then(function (result) {
    result.name = name;
    result.query = query;
    result.fields = fields;
    return res.render('add', result);
  }, function (err) {
    return res.render('add', {name: name, query: query, msg: err.message});
  })
  .catch(function (err) {
    return res.render('error', {title: 'Failed creating a new named query', err: err});
  })
  .done();
}

exports.addSaveOrTest = function (req, res) {
  name = req.body.name;
  query = req.body.query;
  fields = req.body.fields;
  res.locals.add_active = true;

  if (req.body.action == 'Save') {
    return addSave(name, query, fields, res);
  } else if (req.body.action == 'Test') {
    return addTest(name, query, fields, res);
  } else {
    res.status(404);
    res.render('error', {title: 'Unknown action in add', description: 'got action "' + req.body.action + '"'});
  }
}

exports.tables = function (req, res) {
  res.locals.table_active = true;
  queries.tableList()
  .then(function (results) {
    res.render('tables', {'data': results});
  })
  .catch(function (err) {
    res.render('error', {title: 'Error while listing tables', err: err});
  })
  .done();
}

exports.table = function (req, res) {
  res.locals.table_active = true;
  params = queryParams(req);

  dbName = req.params.db;
  tableName = req.params.table;
  query = queries.tableQuery(dbName, tableName);

  displayTable(query, params, res);
}

function distinct(q, res) {
  q
    .then(function (query) {
      return query.distincts();
    })
    .then(function (result) {
      res.render('distinct', {result: result});
    })
    .catch(function (err) {
      res.render('error', {title: 'Error while getting distinct values', err: err});
    })
    .done();
}

exports.tableDistinct = function (req, res) {
  res.locals.table_active = true;
  dbName = req.params.db;
  tableName = req.params.table;

  distinct(queries.tableQuery(dbName, tableName), res);
}

exports.queryDistinct = function (req, res) {
  res.locals.query_active = true;
  query = queries.namedQuery(req.params.name);
  distinct(query, res);
}
