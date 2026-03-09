const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        new HtmlWebpackPlugin({
            template: path.join(appDirectory, 'public/index.html'),
        }),
    ],
    devServer: {
        static: {
            directory: path.join(appDirectory, 'dist'),
        },
        port: 8080,
        hot: true,
    },
};
