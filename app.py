
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-key"
socketio = SocketIO(app, cors_allowed_origins="*")


@dataclass
class ChatState:
    rooms: Dict[str, Dict[str, str]] = field(default_factory=lambda: {"global": {}})

    def add_user(self, username: str, sid: str, room: str = "global") -> None:
        room_users = self.rooms.setdefault(room, {})
        room_users[sid] = username

    def username_exists(self, username: str, room: str = "global") -> bool:
        return username in self.rooms.get(room, {}).values()

    def get_username(self, sid: str, room: str = "global") -> str | None:
        return self.rooms.get(room, {}).get(sid)

    def remove_user(self, sid: str) -> tuple[str | None, str | None]:
        for room, users in list(self.rooms.items()):
            if sid in users:
                username = users.pop(sid)
                if not users:
                    if room == "global":
                        self.rooms[room] = {}
                    else:
                        del self.rooms[room]
                return username, room
        return None, None


def _broadcast_user_list(room: str) -> None:
    participants = sorted(state.rooms.get(room, {}).values())
    emit("user_list", {"users": participants}, room=room)


state = ChatState()


@app.route("/")
def index() -> str:
    return render_template("index.html")


@socketio.on("join")
def handle_join(data: dict) -> None:
    username = (data.get("username") or "").strip()
    if not username:
        emit("error", {"message": "Username is required."}, to=request.sid)
        return

    if state.username_exists(username):
        emit("error", {"message": "This username is already taken."}, to=request.sid)
        return

    state.add_user(username=username, sid=request.sid)
    join_room("global")
    emit("joined", {"username": username}, to=request.sid)
    emit(
        "status",
        {"message": f"{username} joined the chat."},
        room="global",
        skip_sid=request.sid,
    )
    _broadcast_user_list("global")


@socketio.on("message")
def handle_message(data: dict) -> None:
    username = state.get_username(request.sid)
    if username is None:
        emit("error", {"message": "You must join before sending messages."}, to=request.sid)
        return

    message = (data.get("message") or "").strip()
    if not message:
        emit("error", {"message": "Cannot send an empty message."}, to=request.sid)
        return

    emit(
        "message",
        {
            "username": username,
            "message": message,
        },
        room="global",
    )


@socketio.on("disconnect")
def handle_disconnect() -> None:
    username, room = state.remove_user(request.sid)
    leave_room("global")
    if username and room:
        emit("status", {"message": f"{username} left the chat."}, room=room)
        _broadcast_user_list(room)


if __name__ == "__main__":
    socketio.run(app)
