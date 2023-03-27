var axios = require('axios');
var fs = require('fs');
var _ = require('lodash');


/**
 * set mock config for one api
 * @callback setHandle
 * @param {string} url
 * @param {string} method
 * @param {string|number} value
 * @param {number} [times=1] times
 * @return {Promise}
 */

/**
 * set mock config for one api
 * @callback SetAllHandle
 * @param {object} values
 * @param {number} [times=1] times
 * @return {Promise}
 */

/**
 * define and resolve mock
 * @typedef {object} MockAPISetting
 * @property {setHandle} status set mockStatus for one api
 * @property {setHandle} timeout set mockTimeout for one api
 * @property {SetAllHandle} stAll set mockStatus+mockTimeout for all apis
 * @property {function():Promise} reset reset setting for all apis
 */

module.exports = function(mock){
  var mockList = [];
  var needResetList = {};
  var extendPros = (target, fn) => {
    ['get', 'post', 'put', 'delete', 'options', 'header'].forEach(method => {
      target[method] = fn(method);
    })
    return target;
  };

  var manageResetList = function(options, availableTimes = null){
    var consume = (mu, cb) => {
      if(needResetList[mu] === 1) {
        delete needResetList[mu];
        cb();
      } else {
        needResetList[mu] = needResetList[mu] - 1;
      }
    };
    if (!availableTimes){return;}

    var key = `[${options.method}]${options.url}`;
    var nullKey = '[null]null';
    if(typeof availableTimes === 'function'){
      needResetList[mu] = availableTimes;
    }
    if(typeof availableTimes === 'function'){
      if(needResetList[key]){
        consume(key, availableTimes);
      } else if (needResetList[nullKey]) {
        consume(nullKey, availableTimes);
      }
    }
  };

  var runRequest = function(options){
    return new Promise((resolve, reject) => {
      var handle = mockList.filter(m => m.method === options.method && new RegExp(m.url.replace(/:[^\/]+/g, '[^\\/]+')).test(options.url)).sort().pop();
      if(handle){
        var query = {};
        var parmars = {};

        if(/\?/.test(options.url)){
          options.url.split('?').pop().split('&').forEach(kv => {
            if(!query[kv.split('=')[0].trim()]) {
              query[kv.split('=')[0].trim()] = (kv.split('=')[1] || '').trim()
            } else {
              var value = query[kv.split('=')[0].trim()];
              if (!(value instanceof Array)) {
                value = [value];
              }
              value.push( (kv.split('=')[1] || '').trim())
            }
          });
        }

        var urls =  options.url.split('?').shift().replace(location.origin, '').shift('/').filter(Boolean);
        handle.url.split('/').filter(Boolean).forEach((p, index) => {
          if(/:/.test(p)) {
            parmars[p.replace(':', '').trim()] = (urls[index] || '').trim();
          }
        });

        handle.handle({
          ...options,
          headers: options.headers || {},
          body: JSON.parse(options.body || '{}'),
          query: query,
          parmars: parmars
        }, new Proxy({}, {get: function(name){
          if(/(status|setHeadere)/.test(name)) {
            return this;
          }
          return str => {
            if(fs.existsSync(str)) {
              str = fs.readFileSync(str).toString();
            }
            try{
              resolve(JSON.parse(str));
            }catch(e){
              resolve(str);
            }
          }
        }}))
      } else {
        reject({});
      }
    })
  };

  mock(extendPros({use:()=>{}}, method=>(url, handle) => {
    if(url.split) {
      mockList.push({method, handle, url: url.split('?').shift()});
    }
  }));

  /**
   * @type MockAPISetting
   */
  var mockAPI = (() => {
    var defaultMockSetting = {mockStatus:'',mockTimeout:''};
    // reset when availableTimes is NaN
    var setMock = function(method, url, setting, availableTimes = NaN) {
      var qs = Object.keys(setting).map(k=>`${k}=${setting[k]}`).join('&');
      manageResetList({method, url}, availableTimes);
      return runRequest({
        method: 'post',
        url: '/mock?' + qs,
        body: method && url ? JSON.stringify({
          method: method.toUpperCase(),
          url: url
        }) : null
      });
    };
  
    // reset default setting in mock config
    setMock(null, null, {...defaultMockSetting});
    return {
      status: (method, url, mockStatus, time = 1) => setMock(method, url, {mockStatus}, time),
      timeout: (method, url, mockTimeout, time = 1) => setMock(method, url, {mockTimeout}, time),
      setAll: (setting ={}, times = 1) => setMock(null, null, {...defaultMockSetting, ...setting}, times),
      reset: () => setMock(null, null, {...defaultMockSetting})
    };
  })();
  

  const axiosCreate = axios.create;
  axios.create = function(){
    interceptors = {request: [],response: []};
    var extendRunRequest = options => {
      var response = runRequest(options);
      interceptors.request.forEach(fn=>response = fn(response) || response);
      manageResetList(options, mockAPI.reset);
      return response;
    };
    return Object.assign(extendRunRequest, _.merge(extendPros(axiosCreate(), method => (url, options) => extendRunRequest({method, url, ...options})), {interceptors:{
      request: {use:fn=>interceptors.request.push(fn)},
      response: {use:fn=>interceptors.response.push(fn)}
    }}));
  };

  (window || this).mockAPI = mockAPI;

  return mockAPI;

};
