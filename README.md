# Simple Chat Application

This repository contains a minimal real-time chat application built with Flask and Flask-SocketIO.

## Features
- Real-time messaging between connected users.
- Notifications when users join or leave.
- Displays list of active users.

## Getting Started

### Prerequisites
- Python 3.10 or later
- `pip`

### Installation
```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running the Application
```
flask --app app run
```
Then open `http://localhost:5000` in your browser.

## Project Structure
- `app.py`: Flask application with Socket.IO events.
- `templates/index.html`: Frontend chat interface.
- `static/styles.css`: Styling for the chat page.

## License
MIT
