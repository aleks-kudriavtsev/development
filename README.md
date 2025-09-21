# Simple Chat for GitHub Pages

This project delivers a lightweight chat interface that runs entirely in the browser. Real-time messaging and presence are powered by [Firebase Realtime Database](https://firebase.google.com/products/realtime-database), so the site can be hosted statically (for example on GitHub Pages) without a custom backend.

## Features
- Join the chat with a unique username and see who is online in real time.
- Exchange messages instantly with all connected participants.
- Receive inline status notifications when people join or leave the room.
- Responsive layout optimised for desktop and mobile screens.

## Getting Started

### 1. Create a Firebase project
1. Visit the [Firebase console](https://console.firebase.google.com/) and create a project.
2. Enable **Realtime Database** and start in test mode (or configure security rules that fit your needs).
3. In *Project settings → General*, add a new Web App and copy the configuration snippet.

### 2. Configure the frontend
1. Rename `config.example.js` to `config.js`.
2. Replace the placeholder values with the configuration from Firebase. Your file should look similar to:
   ```js
   window.firebaseConfig = {
     apiKey: "...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

### 3. Run locally
Because the app is static, you can open `index.html` directly in your browser or serve the folder via any static file server:
```bash
python -m http.server 8000
```
Then browse to `http://localhost:8000`.

### 4. Deploy to GitHub Pages
1. Push the repository to GitHub.
2. Enable GitHub Pages for the repository and select the `main` (or appropriate) branch with the `/` root.
3. Commit your `config.js` (or add a separate configuration for production) if you are comfortable exposing the Firebase keys. Alternatively, [serve Firebase config via environment variables](https://firebase.google.com/docs/projects/api-keys) or host `config.js` from another secure location.
4. The chat will be available at `https://<username>.github.io/<repository>/` once GitHub Pages finishes building.

## Project Structure
- `index.html` – Static entry point wired to Firebase via browser scripts.
- `static/styles.css` – Styling for the chat UI.
- `static/main.js` – Client-side logic for authentication, messaging, and presence tracking.
- `config.example.js` – Template for Firebase configuration.

## Security Notes
- Firebase API keys are intended to be public, but you should still configure [database security rules](https://firebase.google.com/docs/rules) to restrict write access if you share the site widely.
- Consider enabling domain restrictions in Firebase to ensure only your GitHub Pages domain can access the database.

## License
MIT
