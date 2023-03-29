# mock

引入你的project的步驟

1. 创建自己的mock目录，并创建相应的index来构建入口
```javascript

  const path = require('path');
  const mock = require('mock');

  module.exports = function(app){
    const registerApi = mock.mock(app);

    registerApi(path.join(__dirname, 'login.js'));
  };

```

2. 创建自己的mockAPI
```javascript
  module.exports = function(app, config){

    app.get('/login', config({ data: {username: 'XX**XX'}}));

  };
```

3. 在webpack挂载mock
```javascript

    devServer: {
        contentBase: './public',//本地服务器所加载的页面的目录
        historyApiFallback: true,//不跳转
        inline: true,//实时刷新
        port: 8090,
        hot: true,
        setup: (middlewares, devServer) => {
            if (!devServer) {
                throw new Error('webpack-dev-server is not defined');
            }            // ./mock 就是第2点创建的文件
            require('./mock')(devServer.app);
        },
    },

```

到此mockAPI就介入完成，可以真实的模拟post/get等，而非用json文件模拟或借助其他service

======================================================
======================================================


如果想要用在jest，那有一个前提条件必须用axios请求API
在testSetup 里面如下配置即可模拟API请求
```
  require('mock').jest(require('../mock'));

```
