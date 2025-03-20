# Krushi Radio App

A single-station radio streaming app built with React Native and Expo.

## Features

- Stream a single radio station
- Play/pause controls
- Background audio playback
- Minimalistic, user-friendly interface

## Prerequisites

- Node.js (14.x or higher)
- npm or yarn
- Expo CLI

## Installation

1. Clone this repository
```bash
git clone <repository-url>
cd krushi-radio
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

## Running the App

### Development

```bash
npm start
# or
yarn start
```

This will start the Expo development server. You can then:
- Run on iOS: Press `i` in the terminal or scan the QR code with the Expo Go app
- Run on Android: Press `a` in the terminal or scan the QR code with the Expo Go app

### Building for Production

To create production builds:

```bash
# For Android
expo build:android

# For iOS
expo build:ios
```

## Customizing the Radio Station

To change the radio station URL, edit the `radioUrl` variable in `App.js`:

```javascript
const radioUrl = 'http://your-radio-stream-url-here';
```

## License

MIT

## Credits

Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/). 