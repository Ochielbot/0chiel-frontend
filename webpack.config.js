const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const appDirectory = path.resolve(__dirname, './');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        entry: [path.join(appDirectory, 'index.web.js')],
        output: {
            path: path.resolve(appDirectory, 'dist'),
            publicPath: '/',
            filename: 'bundle.js',
        },
        resolve: {
            extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js'],
            alias: {
                'react-native': 'react-native-web',
            },
            fallback: {
                "process": "process/browser",
                "buffer": "buffer",
                "stream": "stream-browserify",
                "util": "util",
                "crypto": false,
                "fs": false,
                "path": false,
                "os": false
            }
        },
        module: {
            rules: [
                {
                    test: /\.(js|ts|tsx)$/,
                    exclude: /node_modules\/(?!(react-native-elements|react-native-vector-icons|react-native|@react-native|@react-navigation)\/).*/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                'module:@react-native/babel-preset',
                                '@babel/preset-react',
                            ],
                            plugins: ['react-native-web'],
                        },
                    },
                },
                {
                    test: /\.(png|jpe?g|gif|svg)$/,
                    type: 'asset/resource',
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                __DEV__: JSON.stringify(!isProduction),
                'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
                'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
                'process.version': JSON.stringify('v16.0.0'),
                'process.platform': JSON.stringify('web'),
                'process.browser': JSON.stringify(true),
            }),
            new webpack.ProvidePlugin({
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer'],
            }),
            new HtmlWebpackPlugin({
                template: path.join(appDirectory, 'public/index.html'),
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(appDirectory, 'public'),
                        to: path.resolve(appDirectory, 'dist'),
                        filter: (resourcePath) => {
                            // Don't copy index.html as it's handled by HtmlWebpackPlugin
                            return !resourcePath.endsWith('index.html');
                        },
                    },
                ],
            }),
        ],
        devServer: {
            static: [
                {
                    directory: path.join(appDirectory, 'dist'),
                },
                {
                    directory: path.join(appDirectory, 'public'),
                    publicPath: '/',
                },
            ],
            port: 8080,
            hot: true,
        },
    };
};