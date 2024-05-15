
var path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  target: ['web', 'es5'],
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/dist/'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@framework': path.resolve(__dirname, './src/live2d/Framework/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use:{
          loader:"babel-loader",
          options:{
            //预设执行顺序由右往左，所以这里是先处理ts再处理jsx
            presets:[
              "@babel/preset-react",
              "@babel/preset-typescript"
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html"),
      inject: true
    }),
    new webpack.DefinePlugin({
      SERVER_HOST: JSON.stringify(process.env.SERVER_HOST),
      SERVER_PORT: JSON.stringify(process.env.SERVER_PORT),
      SERVER_VERSION: JSON.stringify(process.env.SERVER_VERSION)
    })
  ],
  devServer: {
    static: [
      {
        directory: path.resolve(__dirname, '.'),
        serveIndex: true,
        watch: true,
      }
    ],
    hot: true,
    port: 8000,
    host: '0.0.0.0',
    compress: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  devtool: 'inline-source-map'
}
