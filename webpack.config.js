const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const appDirectory = path.resolve(__dirname, './');

module.exports = {
    entry: [path.join(appDirectory, 'index.web.js')],
    output: {
        path: path.resolve(appDirectory, 'dist'),
        publicPath: '/',
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js'],
        alias: {
            'react-native$': 'react-native-web',
        },
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
            __DEV__: JSON.stringify(true),
            'process.env.NODE_ENV': JSON.stringify('development'),
            'process.env': JSON.stringify({}),
            'process.version': JSON.stringify(''),
            'process.platform': JSON.stringify('web'),
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
