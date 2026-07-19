"""LMS materials API — teacher-owned collections visible to swap partners."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload

from database.models import (
    MaterialCollection,
    MaterialItem,
    SessionLocal,
    Skill,
    User,
)
from services.lms_access import can_view_owner_materials, partner_ids_for_user
from services.notification_service import notify
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict
from utils.uploads import UploadError, delete_upload_file, save_upload

lms_bp = Blueprint("lms", __name__)

VALID_ITEM_TYPES = {"file", "link", "note"}
VALID_VISIBILITY = {"draft", "published"}


def _now():
    return datetime.now(timezone.utc)


def _skill_name(db, skill_id: int) -> str:
    skill = db.query(Skill).get(skill_id)
    return skill.name if skill else ""


def _collection_dict(db, col: MaterialCollection, *, item_count: int | None = None, published_only: bool = False) -> dict:
    if item_count is None:
        if published_only:
            item_count = sum(1 for i in col.items if i.visibility == "published")
        else:
            item_count = len(col.items) if col.items is not None else 0
    return {
        "id": col.id,
        "owner_id": col.owner_id,
        "skill_id": col.skill_id,
        "skill": _skill_name(db, col.skill_id),
        "title": col.title or "",
        "description": col.description or "",
        "item_count": item_count,
        "created_at": col.created_at.isoformat() if col.created_at else None,
        "updated_at": col.updated_at.isoformat() if col.updated_at else None,
    }


def _item_dict(item: MaterialItem) -> dict:
    return {
        "id": item.id,
        "collection_id": item.collection_id,
        "title": item.title,
        "item_type": item.item_type,
        "visibility": item.visibility,
        "body": item.body or "",
        "external_url": item.external_url,
        "file_url": item.file_url,
        "file_name": item.file_name,
        "file_size": item.file_size,
        "mime_hint": item.mime_hint,
        "sort_order": item.sort_order or 0,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _user_teaches_skill(db, user_id: int, skill_id: int) -> bool:
    u = db.query(User).options(joinedload(User.skills_teach)).get(user_id)
    if not u:
        return False
    return any(s.id == skill_id for s in u.skills_teach)


def _notify_partners_published(db, owner: User, collection: MaterialCollection, item: MaterialItem):
    partners = partner_ids_for_user(db, owner.id)
    payload = {
        "owner_id": owner.id,
        "owner_name": owner.name,
        "collection_id": collection.id,
        "collection_title": collection.title,
        "item_id": item.id,
        "item_title": item.title,
        "skill": _skill_name(db, collection.skill_id),
    }
    for pid in partners:
        notify(db, pid, "material_published", payload)


@lms_bp.route("/collections", methods=["GET"])
@require_auth
def list_my_collections(user):
    db = SessionLocal()
    try:
        cols = (
            db.query(MaterialCollection)
            .options(joinedload(MaterialCollection.items))
            .filter_by(owner_id=user.id)
            .order_by(MaterialCollection.updated_at.desc())
            .all()
        )
        return jsonify({"collections": [_collection_dict(db, c) for c in cols]})
    finally:
        db.close()


@lms_bp.route("/collections", methods=["POST"])
@require_auth
def create_collection(user):
    data = request.get_json() or {}
    skill_id = data.get("skill_id")
    skill_name = (data.get("skill") or data.get("skill_name") or "").strip()
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()

    db = SessionLocal()
    try:
        skill = None
        if skill_id:
            skill = db.query(Skill).get(int(skill_id))
        elif skill_name:
            skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if not skill:
            return jsonify({"error": "Skill not found"}), 404
        if not _user_teaches_skill(db, user.id, skill.id):
            return jsonify({"error": "You can only create collections for skills you teach"}), 403

        existing = (
            db.query(MaterialCollection)
            .filter_by(owner_id=user.id, skill_id=skill.id)
            .first()
        )
        if existing:
            return jsonify({"error": "A collection for this skill already exists", "collection": _collection_dict(db, existing)}), 409

        if not title:
            title = f"{skill.name} materials"

        col = MaterialCollection(
            owner_id=user.id,
            skill_id=skill.id,
            title=title,
            description=description,
        )
        db.add(col)
        db.commit()
        db.refresh(col)
        return jsonify({"collection": _collection_dict(db, col, item_count=0)}), 201
    finally:
        db.close()


@lms_bp.route("/collections/<int:collection_id>", methods=["PATCH"])
@require_auth
def update_collection(user, collection_id):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        col = (
            db.query(MaterialCollection)
            .options(joinedload(MaterialCollection.items))
            .get(collection_id)
        )
        if not col:
            return jsonify({"error": "Not found"}), 404
        if col.owner_id != user.id:
            return jsonify({"error": "Forbidden"}), 403

        if "title" in data:
            title = (data.get("title") or "").strip()
            if title:
                col.title = title
        if "description" in data:
            col.description = (data.get("description") or "").strip()
        col.updated_at = _now()
        db.commit()
        db.refresh(col)
        return jsonify({"collection": _collection_dict(db, col)})
    finally:
        db.close()


@lms_bp.route("/collections/<int:collection_id>", methods=["DELETE"])
@require_auth
def delete_collection(user, collection_id):
    db = SessionLocal()
    try:
        col = (
            db.query(MaterialCollection)
            .options(joinedload(MaterialCollection.items))
            .get(collection_id)
        )
        if not col:
            return jsonify({"error": "Not found"}), 404
        if col.owner_id != user.id:
            return jsonify({"error": "Forbidden"}), 403

        for item in list(col.items):
            if item.item_type == "file":
                delete_upload_file(item.file_url)

        db.delete(col)
        db.commit()
        return jsonify({"message": "Collection deleted"})
    finally:
        db.close()


@lms_bp.route("/collections/<int:collection_id>/items", methods=["GET"])
@require_auth
def list_collection_items(user, collection_id):
    db = SessionLocal()
    try:
        col = (
            db.query(MaterialCollection)
            .options(joinedload(MaterialCollection.items))
            .get(collection_id)
        )
        if not col:
            return jsonify({"error": "Not found"}), 404

        is_owner = col.owner_id == user.id
        if not is_owner and not can_view_owner_materials(db, user.id, col.owner_id):
            return jsonify({"error": "Forbidden"}), 403

        items = sorted(col.items, key=lambda i: (i.sort_order or 0, i.id))
        if not is_owner:
            items = [i for i in items if i.visibility == "published"]

        return jsonify({
            "collection": _collection_dict(db, col, published_only=not is_owner),
            "items": [_item_dict(i) for i in items],
            "is_owner": is_owner,
        })
    finally:
        db.close()


@lms_bp.route("/collections/<int:collection_id>/items", methods=["POST"])
@require_auth
def create_item(user, collection_id):
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    item_type = (data.get("item_type") or "").strip().lower()
    visibility = (data.get("visibility") or "draft").strip().lower()
    body = (data.get("body") or "").strip()
    external_url = (data.get("external_url") or "").strip() or None
    file_url = (data.get("file_url") or "").strip() or None
    file_name = (data.get("file_name") or "").strip() or None
    file_size = data.get("file_size")
    mime_hint = (data.get("mime_hint") or "").strip() or None
    sort_order = data.get("sort_order", 0)

    if not title:
        return jsonify({"error": "title is required"}), 400
    if item_type not in VALID_ITEM_TYPES:
        return jsonify({"error": "item_type must be file, link, or note"}), 400
    if visibility not in VALID_VISIBILITY:
        return jsonify({"error": "visibility must be draft or published"}), 400
    if item_type == "link" and not external_url:
        return jsonify({"error": "external_url is required for link items"}), 400
    if item_type == "file" and not file_url:
        return jsonify({"error": "file_url is required for file items"}), 400
    if item_type == "note" and not body:
        return jsonify({"error": "body is required for note items"}), 400

    db = SessionLocal()
    try:
        col = db.query(MaterialCollection).get(collection_id)
        if not col:
            return jsonify({"error": "Not found"}), 404
        if col.owner_id != user.id:
            return jsonify({"error": "Forbidden"}), 403

        item = MaterialItem(
            collection_id=col.id,
            title=title,
            item_type=item_type,
            visibility=visibility,
            body=body,
            external_url=external_url if item_type == "link" else None,
            file_url=file_url if item_type == "file" else None,
            file_name=file_name if item_type == "file" else None,
            file_size=int(file_size) if file_size is not None and item_type == "file" else None,
            mime_hint=mime_hint if item_type == "file" else None,
            sort_order=int(sort_order) if sort_order is not None else 0,
        )
        db.add(item)
        col.updated_at = _now()
        db.commit()
        db.refresh(item)

        if visibility == "published":
            owner = db.query(User).get(user.id)
            if owner:
                _notify_partners_published(db, owner, col, item)
                db.commit()

        return jsonify({"item": _item_dict(item)}), 201
    finally:
        db.close()


@lms_bp.route("/items/<int:item_id>", methods=["PATCH"])
@require_auth
def update_item(user, item_id):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        item = (
            db.query(MaterialItem)
            .options(joinedload(MaterialItem.collection))
            .get(item_id)
        )
        if not item or not item.collection:
            return jsonify({"error": "Not found"}), 404
        if item.collection.owner_id != user.id:
            return jsonify({"error": "Forbidden"}), 403

        was_published = item.visibility == "published"

        if "title" in data:
            title = (data.get("title") or "").strip()
            if title:
                item.title = title
        if "body" in data:
            item.body = (data.get("body") or "").strip()
        if "external_url" in data and item.item_type == "link":
            url = (data.get("external_url") or "").strip()
            if url:
                item.external_url = url
        if "visibility" in data:
            vis = (data.get("visibility") or "").strip().lower()
            if vis not in VALID_VISIBILITY:
                return jsonify({"error": "visibility must be draft or published"}), 400
            item.visibility = vis
        if "sort_order" in data and data["sort_order"] is not None:
            item.sort_order = int(data["sort_order"])

        item.updated_at = _now()
        item.collection.updated_at = _now()
        db.commit()
        db.refresh(item)

        if item.visibility == "published" and not was_published:
            owner = db.query(User).get(user.id)
            if owner:
                _notify_partners_published(db, owner, item.collection, item)
                db.commit()

        return jsonify({"item": _item_dict(item)})
    finally:
        db.close()


@lms_bp.route("/items/<int:item_id>", methods=["DELETE"])
@require_auth
def delete_item(user, item_id):
    db = SessionLocal()
    try:
        item = (
            db.query(MaterialItem)
            .options(joinedload(MaterialItem.collection))
            .get(item_id)
        )
        if not item or not item.collection:
            return jsonify({"error": "Not found"}), 404
        if item.collection.owner_id != user.id:
            return jsonify({"error": "Forbidden"}), 403

        if item.item_type == "file":
            delete_upload_file(item.file_url)

        col = item.collection
        db.delete(item)
        col.updated_at = _now()
        db.commit()
        return jsonify({"message": "Item deleted"})
    finally:
        db.close()


@lms_bp.route("/upload", methods=["POST"])
@require_auth
def upload_lms_file(user):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    try:
        result = save_upload(request.files["file"], subdir="lms")
    except UploadError as exc:
        return jsonify({"error": exc.message}), exc.status
    return jsonify(result), 201


@lms_bp.route("/partners", methods=["GET"])
@require_auth
def list_partners(user):
    db = SessionLocal()
    try:
        pids = partner_ids_for_user(db, user.id)
        partners = []
        for pid in sorted(pids):
            partner = db.query(User).get(pid)
            if not partner:
                continue
            cols = (
                db.query(MaterialCollection)
                .options(joinedload(MaterialCollection.items))
                .filter_by(owner_id=pid)
                .all()
            )
            published_cols = []
            for c in cols:
                pub_count = sum(1 for i in c.items if i.visibility == "published")
                if pub_count > 0:
                    published_cols.append(_collection_dict(db, c, item_count=pub_count))
            partners.append({
                "user": user_to_dict(partner, include_skills=False),
                "collections": published_cols,
                "published_item_count": sum(c["item_count"] for c in published_cols),
            })
        partners.sort(key=lambda p: (p["user"].get("name") or "").lower())
        return jsonify({"partners": partners})
    finally:
        db.close()


@lms_bp.route("/partners/<int:partner_id>/collections", methods=["GET"])
@require_auth
def partner_collections(user, partner_id):
    db = SessionLocal()
    try:
        if not can_view_owner_materials(db, user.id, partner_id):
            return jsonify({"error": "Forbidden"}), 403

        partner = db.query(User).get(partner_id)
        if not partner:
            return jsonify({"error": "Not found"}), 404

        cols = (
            db.query(MaterialCollection)
            .options(joinedload(MaterialCollection.items))
            .filter_by(owner_id=partner_id)
            .order_by(MaterialCollection.updated_at.desc())
            .all()
        )
        result = []
        for c in cols:
            pub_count = sum(1 for i in c.items if i.visibility == "published")
            if pub_count > 0 or partner_id == user.id:
                result.append(_collection_dict(db, c, item_count=pub_count, published_only=True))

        return jsonify({
            "partner": user_to_dict(partner, include_skills=False),
            "collections": result,
        })
    finally:
        db.close()
