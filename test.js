const notifier = require('node-notifier');

// Basic notification
notifier.notify({
  title: 'Test Notification',
  message: 'This is a notification on macOS!',
  sound: true, // Play sound with notification
  wait: true   // Wait for user to respond (useful for interactive notifications)
});