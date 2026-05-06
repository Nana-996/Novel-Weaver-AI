# Converting Novel Weaver AI to a Mobile App for Personal Use

This guide explains how to convert the Novel Weaver AI web application into a mobile app for your personal use on iOS devices.

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **npm** (comes with Node.js)
3. **Apple ID** (free)
4. **Xcode** (for iOS development - available on Mac only)
5. **Expo CLI** or **React Native CLI**

## Method 1: Using Expo (Recommended for Beginners)

### Step 1: Install Expo CLI
```bash
npm install -g expo-cli
```

### Step 2: Create a New Expo Project
```bash
expo init novel-weaver-mobile
```
Choose the "blank (TypeScript)" template when prompted.

### Step 3: Install Required Dependencies
```bash
cd novel-weaver-mobile
npm install @react-native-async-storage/async-storage
```

### Step 4: Adapt the Code
1. Copy the components from the web app to the mobile app:
   - Copy all files from `components/` directory
   - Copy `services/geminiService.ts`
   - Copy `types.ts`
   - Copy `hooks/useHistoryState.ts`

2. Modify the components to work with React Native:
   - Replace HTML elements with React Native components
   - Replace CSS classes with StyleSheet objects
   - Replace localStorage with AsyncStorage

### Step 5: Update App.js
Replace the contents of `App.js` with the main application logic adapted for React Native.

### Step 6: Run the App
```bash
expo start
```

### Step 7: Build for iOS
```bash
expo build:ios
```

## Method 2: Using React Native CLI

### Step 1: Create a New React Native Project
```bash
npx react-native init NovelWeaverMobile
```

### Step 2: Install Required Dependencies
```bash
cd NovelWeaverMobile
npm install @react-native-async-storage/async-storage
```

### Step 3: Adapt the Code
Follow the same steps as in Method 1 for adapting the code.

### Step 4: Run the App
```bash
npx react-native run-ios
```

## Key Adaptations Needed

### 1. Component Changes
- Replace `<div>` with `<View>`
- Replace `<p>`, `<span>` with `<Text>`
- Replace `<input>`, `<textarea>` with `<TextInput>`
- Replace `<button>` with `<TouchableOpacity>` or `<Pressable>`

### 2. Styling Changes
- Replace CSS classes with StyleSheet objects
- Use Flexbox properties compatible with React Native

### 3. Storage Changes
- Replace `localStorage` with `AsyncStorage`:
```javascript
// Web
localStorage.setItem('key', 'value');
localStorage.getItem('key');

// Mobile
AsyncStorage.setItem('key', 'value');
AsyncStorage.getItem('key');
```

### 4. Navigation Changes
- Implement React Navigation instead of browser-based routing

## Building for Personal Use

### iOS (Mac Only)
1. Enroll in Apple Developer Program (free for personal use)
2. Connect your iOS device to your Mac
3. In Xcode, select your device from the target dropdown
4. Click "Run" to install the app on your device

### Android
1. Enable Developer Options and USB Debugging on your Android device
2. Connect your device via USB
3. Run `npx react-native run-android` to install the app

## Limitations

1. **Free Apple Developer Account**:
   - Apps expire after 7 days and need reinstallation
   - Limited to 30 devices for testing
   - No App Store distribution

2. **Development Environment**:
   - iOS development requires a Mac
   - Xcode is only available on macOS

## Next Steps

1. Start by creating a simple prototype with just the chat functionality
2. Gradually add more features like manuscript view, notes, etc.
3. Test thoroughly on your device
4. Optimize the UI for mobile screen sizes

This approach allows you to have a personal copy of Novel Weaver AI on your mobile device without distributing it to others.