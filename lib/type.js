module.exports = {};

/**
 * Express Application
 * @typedef {import('express').Application} App
 */

/**
 * Request used by Express Application
 * @typedef {import('express').Request} Request
 */

/**
 * callback function used by Express Application
 * @typedef {import('express').RequestHandler} MockHandler
 */

/**
 * define and resolve mock
 * @typedef {function(Request):string} Handle
 */

/**
 * MockHandlerParam
 * @typedef {string | Handle | Record<string, any>} MockHandlerParam
 */



/**
 * Register Api
 * @callback RegisterApi
 * @param {string} childPath
 * @param {Partial<Helper>} [extendHelper]
 */

/**
 * Get Register Api
 * @callback GetRegisterApi
 * @param {App} App
 * @param {string} [mockUrl]
 * @return {RegisterApi}
 */

/**
 * mock APIs for webpack-dev-service
 * @callback MockAPIs
 * @param {App} App
 * @param {FileManage} config
 * @param {Helper} helper
 */

/**
 * match the mock by condition
 * @callback MockCondition
 * @param {string} mockStatus
 * @return {boolean}
 */

/**
 * define and resolve mock
 * @typedef {object} ResponsiveMock
 * @property {string | MockCondition} key mockStatus or its condition function
 * @property {string} info
 * @property {string | MockHelper} file path or the m,ock file or its handler
 */

/**
 * managee mock files
 * @callback FileManage
 * @param {MockHandlerParam} defaultMock
 * @param {ResponsiveMock[]} [mocks]
 * @param {number} [timeout]
 * @return {MockHandler}
 */

/**
 * get cache
 * @callback CacheFn
 * @param {string} url
 * @return {any}
 */

/**
 * define and resolve mock
 * make sure the mocked account info sing-sourced from the dummy of the antire mocked server
 * @callback Covert
 * @param {Record<string, any>} data
 * @param {Request} req
 * @return {Record<string, any>}
 */

/**
 * define and resolve mock
 * @callback HandleCovert
 * @param {MockHandlerParam} handle
 * @return {MockHandler}
 */

/**
 * define and resolve mock
 * @callback MockUpdate
 * @param {Convert} convert
 * @return {HandleCovert}
 */

/**
 * @typedef {object} Helper
 * @property {MockUpdate} mockUpdate
 * @property {HandleCovert} mockRandom
 */
