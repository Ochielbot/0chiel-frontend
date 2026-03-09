import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// @ts-ignore
AppRegistry.registerComponent(appName, () => App);
// @ts-ignore
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
