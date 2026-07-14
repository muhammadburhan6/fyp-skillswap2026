# SkillSwap — MongoDB Collection Schemas

> **Note:** Mongoose is a Node.js ODM. The Flask backend uses **PyMongo** with the schemas below.
> MongoDB stores canonical user/session/match data.

---

## 1. `users`

```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "display_name": "string",
  "avatar_url": "string | null",
  "bio": "string",
  "skills_teach": ["Video Editing", "Python", "..."],
  "skills_learn": ["UI Design", "Spanish", "..."],
  "skill_points": 200,
  "xp": 0,
  "level": 1,
  "heart_tokens_balance": 100,
  "heart_tokens_last_reset": "ISODate",
  "role": "user | admin",
  "onboarding_complete": false,
  "notification_preferences": {
    "email_matches": true,
    "email_sessions": true,
    "push_enabled": false
  },
  "activity_streak": 0,
  "last_active_at": "ISODate",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

---

## 2. `matches`

```json
{
  "_id": "ObjectId",
  "user_a_id": "ObjectId (ref users)",
  "user_b_id": "ObjectId (ref users)",
  "skill_offered": "string",
  "skill_requested": "string",
  "match_score": 77,
  "status": "pending | accepted | declined | completed",
  "matched_at": "ISODate",
  "accepted_at": "ISODate | null",
  "firestore_chat_id": "string | null",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

---

## 3. `sessions`

```json
{
  "_id": "ObjectId",
  "match_id": "ObjectId (ref matches)",
  "host_id": "ObjectId (ref users)",
  "guest_id": "ObjectId (ref users)",
  "skill": "string",
  "title": "string",
  "description": "string",
  "scheduled_at": "ISODate",
  "duration_minutes": 60,
  "timezone": "Asia/Karachi",
  "status": "scheduled | in_progress | completed | cancelled",
  "heart_tokens_cost": 10,
  "xp_awarded": 25,
  "meeting_link": "string | null",
  "notes": "string",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

---

## 4. `chats` (MongoDB metadata; messages live in Firestore)

```json
{
  "_id": "ObjectId",
  "match_id": "ObjectId (ref matches)",
  "participants": ["ObjectId", "ObjectId"],
  "firestore_room_id": "string",
  "last_message_preview": "string",
  "last_message_at": "ISODate",
  "unread_counts": {
    "<user_id>": 0
  },
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Firestore subcollection:** `chats/{roomId}/messages/{messageId}`

```json
{
  "sender_id": "string",
  "text": "string",
  "type": "text | system",
  "created_at": "Timestamp",
  "read_by": ["user_id"]
}
```

---

## 5. `tokens` (daily Heart Token ledger)

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref users)",
  "date": "YYYY-MM-DD",
  "allocated": 100,
  "spent": 0,
  "remaining": 100,
  "transactions": [
    {
      "amount": -10,
      "reason": "session_booking | ai_premium | admin_adjustment",
      "reference_id": "ObjectId | null",
      "created_at": "ISODate"
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

---

## 6. `admin_logs` (optional, for Admin Page)

```json
{
  "_id": "ObjectId",
  "admin_id": "ObjectId",
  "action": "token_distribution | user_ban | platform_alert",
  "target_user_id": "ObjectId | null",
  "metadata": {},
  "created_at": "ISODate"
}
```
