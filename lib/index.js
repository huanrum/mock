const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const _ = require('lodash');

const random = () => mock => mock;

/** @type {import('./type.js').GetRegisterApi} */
module.exports = function(app, mockUrl = '/mock') {
  const splitServices = {};
  const appConfig = {};

  const manageCache = (() => {
    const cache = {};
    return (url, method, get) => {
      const key = `[${method.toUpperCase()}]${url}`;
      if (get) {
        cache[key] = get;
      }
      return cache[key];
    }
  })();

  /**
   * @param {string} pathname 
   * @returns {Record<string, import('./type').cacheFn>}
   */
  const getCache = (pathname) => new Proxy({}, { get: function(target, name){
    if (typeof name === 'string') {
      if (name === 'pathname') {
        return pathname;
      }
      return (url) => {
        return new Promise(resolve => {
          const cacheFn = manageCache(url, name) || (() => resolve());
          cacheFn(new Proxy({}, { get: () => file => {
            if (typeof file === 'string' && fs.existsSync(path.join(pathname, '../', file))) {
              const data = fs.readFileSync(path.join(pathname, '../', file)).toString();
              try {
                resolve(JSON.parse(data));
              }catch(e){
                resolve(data);
              }
            } else {
              resolve(file);
            }
          }}));
        });
      }
    }
  }});

  /**
   * @param {string} pathname 
   * @returns {import('./type').Application}
   */
  const getApp = (pathname) => new Proxy(app, { get: function(target, name){
    if (typeof target[name] === 'function' && typeof name === 'string') {
      const filename = pathname.replace(path.join(__dirname, '/../'), '');
      appConfig[filename] = appConfig[filename] || [];
      return function(url, callback, ...rest){
        const config = {method: name.toUpperCase(), url: url, __mockTimeout: callback.mockTimeout, config: callback.toString(), parmars: callback.parmars, func: callback.func};
        appConfig[filename].push(config);

        const [realUrl, qs] = url.split('?');
        const newCallback = (req, res, ...args) => {
          if (req.headers.mockstatus === '*') {
            return res.send(config.config || []);
          }
          req.headers.mockStatus = req.headers.mockstatus || config.mockStatus;
          if (/^[0-9]+$/.test(req.headers.mockStatus)) {
            res.status(req.headers.mockStatus);
          }
          manageCache(url, name, getCache => callback(req, getCache, ...args));

          const timeout = parseInt(req.headers.mocktimeout || config.mockTimeout || callback.mockTimeout);
          if (timeout) {
            return new Promise(resolve => setTimeout(() => setTimeout(callback(req, res, ...args)), timeout));
          }
          return callback(req, res, ...args)
        };

        const qsDefault = 'default';
        const realUrlKey = `[${name}]${realUrl}`;
        if (!splitServices[realUrlKey]) {
          splitServices[realUrlKey] = {[qs || qsDefault]: newCallback };
          return target[name](realUrl, (req, res, ...args) => {
            const equal = (source, value) => source === `${value}` || (source === undefined && value !== undefined);
            const key = Object.keys(splitServices[realUrlKey]).filter(q => q.split('&').every(kv => equal(kv.split('=')[1], _.get(req, kv.split('=')[0])))).pop() || qsDefault;
            return splitServices[realUrlKey][key] ? splitServices[realUrlKey][key](req, res, ...args) : res.send(`${realUrlKey} not found`);
          }, ...rest);
        }
        splitServices[realUrlKey][qs || qsDefault] = newCallback;
      }
    } else {
      return target[name];
    }
  }});

  /**
   * @param {string} pathname 
   * @returns {import('./type').FileManage}
   */
  const getFileManage = (pathname) => (defaultMock, mocks = [], timeout = 0) => {
    const getParmars = strFn => _.uniq(strFn.match(/(?<![a-z0-1_])req\.(params|query|headers|body)\.[a-z0-1_.]+/ig) || []).filter(i => i!== 'req.headers.mockStatus').map(i => i.replace('req', ''));
    const createDefauktOption = fn => ({key: 'default', file: fn, indfo: 'API and data are all ok'});
    const sortFn = (key) => /\[object (.*)]/.exec(Object.prototype.toString.call(key))[1];
    return Object.assign((req, res) => {
      const checkStatus = op => typeof op.key === 'function' ? op.key(req.headers.mockStatus) : op.key.toString() === req.headers.mockStatus;
      const matchedMock = mocks.filter(checkStatus).sort((a, b) => sortFn(a.key) > sortFn(b.key) ? -1 : 1).shift() || createDefauktOption(() => null);
      const filename = (fileFn) => typeof fileFn === 'function' ? fileFn.call(getCache(pathname), req, res) : fileFn;
      Promise.resolve(filename(matchedMock.file) || filename(defaultMock || mocks[0].file)).then(file => {
        if (file){
          if(typeof file === 'string') {
            res.sendFile(path.join(pathname, '/../', file));
          } else {
            res.json(file);
          }
        } else {
          res.end('default return not found');
        }
      });
    }, {
      toString: () => mocks.length > 1 ? mocks.map(i => ({
        id: (i.key || 'unknown').toString(), message: i.info || 'unknown, please add', parmars: getParmars(i.file.toString()), func: i.file.toString()
      })): '',
      mockTimeout: timeout,
      parmars: getParmars(defaultMock.toString()),
      func: defaultMock.toString()
    });
  };

  /**
   * @type {import('./type').MockUpdate}
   */
  const handleMockUpdate = convert => handle => Object.assign(function(req){
    const file = typeof handle === 'function' ? handle(req) : handle;
    try{
      if(/\.json$/.test(file) && fs.existsSync(path.join(this.pathname, '/../', file))) {
        const mock = JSON.parse(fs.readFileSync(path.join(this.pathname, '/../', file)).toString());
        return convert.call(this, mock, req) || mock;
      } else {
        return convert.call(this, file, req) || file;
      }
    }catch(e){
      console.error(e);
    }
    return file;
  }, { toString: () => handle.toString()});

  /**
   * @type {import('./type').Convert}
   */
  const updateRandom = (mock, req) => {
    return random(req)(mock);
  };

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));

  app.use(function(req, res, next){
    /* Setuo CORS on MFA dev mode so that Main Application/Shell can use local dummy data for mocked APIs */
    const {
      ['access-control-request-headers'] : accessControlRequestHeaders = '',
      origin = ''
    } = req.headers || {};
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', accessControlRequestHeaders);
    res.setHeader('Access-Control-Allow-Matheds', 'OPTIONS,GET,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-cREDENTIALS', 'true');
    // Respond to CORS Preflight OPTIONS call
    if(req.method === 'OPTIONS' || req.method === 'options') return res.status(200).end();
    next();
    /* End of CORS seetings */
  });

  app.get(mockUrl, (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html')).toString();
    const filepath = path.join(__dirname, '../../../').replace(/\\/g, '\\\\');
    const content = html.replace(/<script>window.\$data\s*=\s*{};<\/script>/, `
      <script>window.$data=${JSON.stringify(appConfig).replace(new RegExp(filepath.replace(/\\/g, '\\\\'), 'ig'), '\\\\')};</script>
    `);
    res.send(content);
  });

  app.post(mockUrl, (req, res) => {
    Object.keys(appConfig).forEach(f => {
      appConfig[f].forEach(item => {
        if(!req.body || !Object.keys(req.body).length || (item.method === req.body.method && item.url === req.body.url)) {
          Object.assign(item, req.query);
        }
      })
    });
    res.send('');
  });

  registerApi(path.join(__dirname, 'config/index.js'));

  return registerApi;

  /** @type {import('./type').RegisterApi} */
  function registerApi(registerPath, extendHelper = {}) {
    if (fs.statSync(registerPath).isFile()) {
      /**  */
      const addMock = require(registerPath.replace(__dirname, './'));
      const helper = Object.assign(extendHelper, { mockUpdate: handleMockUpdate, mockRandom: handleMockUpdate(updateRandom), cache: getCache(registerPath)});
      addMock(getApp(registerPath), getFileManage(registerPath), {...helper});
    } else {
      (function updateConfigAPI(pathname, level = 0){
        fs.readdirSync(pathname).forEach(dir => {
          const childPath = path.join(pathname, dir);
          if (fs.statSync(childPath).isFile()) {
            if(/\.[jt]s$/.test(childPath)) {
              try{
                registerApi(childPath, extendHelper);
              } catch (e){
                console.log(e);
              }
            }
          } else if(level < 10) {
            updateConfigAPI(childPath, level + 1);
          }
        });
      })(registerPath);
    }
  }
};
