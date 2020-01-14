'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react-native-pager.cjs.production.min.js');
} else {
  module.exports = require('./react-native-pager.cjs.development.js');
}
