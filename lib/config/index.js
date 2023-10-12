
/**
 * @type {import('../type').MockAPIs}
 */
module.exports = function(app, config){

  app.get('/url', config({data: 'sucess'}));

  app.get('/url1', config('../data/demo1.json'));

  app.get('/url2', config('../data/demo2.json', [
    {
      key: 'error',
      info: 'error',
      file: '../data/demo2-error.json'
    }
  ]));

  app.get('/url3', config(req => {
    if (req.query.index === '1') {
      return '../data/demo3-1.json'
    }
    return '../data/demo3.json'
  }, [
    {
      key: 'error',
      info: 'error message',
      file: '../data/demo3-error.json'
    },
    {
      key: () => 'warning',
      info: 'warning message',
      file: '../data/demo3-warning.json'
    },
  ]));

};
