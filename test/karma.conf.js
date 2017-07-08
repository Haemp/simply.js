module.exports = function(config) {
  config.set({
      files: './test/*.spec.js'
      basePath: '../..',
      frameworks: ['jasmine']
  });
};
