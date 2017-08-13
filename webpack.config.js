const path = require('path');

module.exports = {
    entry: './simply.js',
    output: {
        path: path.resolve(__dirname),
        filename: 'simply.min.js'
    },
    module: {
        rules: [{
            test: require.resolve('./simply.js'),
            use: [{
                loader: 'expose-loader',
                options: 'Simply'
            }]
        }]
    }
};