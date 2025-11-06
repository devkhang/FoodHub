// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Tắt source map cho node_modules
      webpackConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules\/@antv/,
      });
      return webpackConfig;
    },
  },
};