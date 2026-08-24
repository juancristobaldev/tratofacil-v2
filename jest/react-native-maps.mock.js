const React = require('react');
const { View } = require('react-native');

class MockComponent extends React.Component {
  render() {
    return React.createElement(View, this.props, this.props.children);
  }
}
MockComponent.displayName = 'MockComponent';

class AnimatedRegion {
  constructor(value) {
    this.latitude = value?.latitude || 0;
    this.longitude = value?.longitude || 0;
    this.latitudeDelta = value?.latitudeDelta || 0;
    this.longitudeDelta = value?.longitudeDelta || 0;
  }
  setValue(val) {
    Object.assign(this, val);
  }
  timing(opts) {
    return {
      start: (cb) => cb && cb({ finished: true }),
    };
  }
}

module.exports = {
  __esModule: true,
  default: MockComponent,
  MapView: MockComponent,
  Marker: MockComponent,
  Polyline: MockComponent,
  Circle: MockComponent,
  Polygon: MockComponent,
  Callout: MockComponent,
  AnimatedRegion,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
};
