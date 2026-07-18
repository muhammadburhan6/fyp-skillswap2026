"""Verifies the message:send Socket.IO handler notifies the other participant.

Uses Flask-SocketIO's in-process test client so this doesn't depend on a real
network/WebSocket transport.
"""

import uuid

from app import app as flask_app, socketio
from database.models import Conversation, SessionLocal
from tests.conftest import auth_header


def _email(prefix="socket"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _make_conversation(user_a_id, user_b_id):
    db = SessionLocal()
    try:
        from database.models import User
        conv = Conversation()
        conv.participants.extend([db.get(User, user_a_id), db.get(User, user_b_id)])
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv.id
    finally:
        db.close()


def test_message_send_notifies_other_participant(client, make_user):
    sender = make_user(_email("sender"))
    recipient = make_user(_email("recipient"))
    conv_id = _make_conversation(sender["id"], recipient["id"])

    flask_app.config.update(TESTING=True)
    socket_client = socketio.test_client(
        flask_app, auth={"token": sender["token"]}, flask_test_client=client,
    )
    assert socket_client.is_connected()

    socket_client.emit("message:send", {"conversation_id": conv_id, "content": "hello there"})

    resp = client.get(f"/api/notifications/", headers=auth_header(recipient["token"]))
    notifs = resp.get_json()["notifications"]
    message_notifs = [n for n in notifs if n["type"] == "message"]
    assert len(message_notifs) == 1
    assert message_notifs[0]["payload"]

    socket_client.disconnect()


def test_message_send_does_not_notify_sender(client, make_user):
    sender = make_user(_email("sender"))
    recipient = make_user(_email("recipient"))
    conv_id = _make_conversation(sender["id"], recipient["id"])

    flask_app.config.update(TESTING=True)
    socket_client = socketio.test_client(
        flask_app, auth={"token": sender["token"]}, flask_test_client=client,
    )

    socket_client.emit("message:send", {"conversation_id": conv_id, "content": "hi"})

    resp = client.get(f"/api/notifications/", headers=auth_header(sender["token"]))
    notifs = resp.get_json()["notifications"]
    assert not any(n["type"] == "message" for n in notifs)

    socket_client.disconnect()
