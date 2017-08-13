module.exports = function(config) {
  config.set({
      files: [
          './simply.min.js',
          './test/*.spec.js'
      ],
      basePath: '..',
      frameworks: ['jasmine'],
      browsers: ['Chrome'],
      autoWatch: true
  });
};
