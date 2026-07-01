from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.api.schemas import ScheduleCreate, ScheduleUpdate
from app.core.database import get_connection

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _normalize_datetime(value: datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)

    return value.replace(microsecond=0).isoformat(timespec="seconds")


def _schedule_from_row(row) -> dict[str, object]:
    member = None
    if row["member_name"] is not None:
        member = {
            "id": row["member_id"],
            "name": row["member_name"],
            "department": row["member_department"],
            "role": row["member_role"],
            "is_active": bool(row["member_is_active"]),
        }

    return {
        "id": row["id"],
        "member_id": row["member_id"],
        "title": row["title"],
        "type": row["type"],
        "start_at": row["start_at"],
        "end_at": row["end_at"],
        "location": row["location"],
        "memo": row["memo"],
        "all_day": bool(row["all_day"]),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "member": member,
    }


def _fetch_schedule(connection, schedule_id: int):
    return connection.execute(
        """
        SELECT
          s.id,
          s.member_id,
          s.title,
          s.type,
          s.start_at,
          s.end_at,
          s.location,
          s.memo,
          s.all_day,
          s.status,
          s.created_at,
          s.updated_at,
          m.name AS member_name,
          m.department AS member_department,
          m.role AS member_role,
          m.is_active AS member_is_active
        FROM schedules s
        LEFT JOIN members m ON m.id = s.member_id
        WHERE s.id = ?
        """,
        (schedule_id,),
    ).fetchone()


@router.get("")
def list_schedules(
    from_at: datetime | None = Query(default=None, alias="from"),
    to_at: datetime | None = Query(default=None, alias="to"),
    member_id: int | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    type_filter: str | None = Query(default=None, alias="type"),
) -> dict[str, list[dict[str, object]]]:
    conditions: list[str] = ["1 = 1"]
    values: list[object] = []

    if from_at is not None:
        conditions.append("s.end_at > ?")
        values.append(_normalize_datetime(from_at))

    if to_at is not None:
        conditions.append("s.start_at < ?")
        values.append(_normalize_datetime(to_at))

    if member_id is not None:
        conditions.append("s.member_id = ?")
        values.append(member_id)

    normalized_status = _normalize_text(status_filter)
    if normalized_status is not None:
        conditions.append("s.status = ?")
        values.append(normalized_status)

    normalized_type = _normalize_text(type_filter)
    if normalized_type is not None:
        conditions.append("s.type = ?")
        values.append(normalized_type)

    query = f"""
        SELECT
          s.id,
          s.member_id,
          s.title,
          s.type,
          s.start_at,
          s.end_at,
          s.location,
          s.memo,
          s.all_day,
          s.status,
          s.created_at,
          s.updated_at,
          m.name AS member_name,
          m.department AS member_department,
          m.role AS member_role,
          m.is_active AS member_is_active
        FROM schedules s
        LEFT JOIN members m ON m.id = s.member_id
        WHERE {' AND '.join(conditions)}
        ORDER BY s.start_at ASC, s.id ASC
    """

    with get_connection() as connection:
        rows = connection.execute(query, tuple(values)).fetchall()

    return {"items": [_schedule_from_row(row) for row in rows]}


@router.get("/{schedule_id}")
def get_schedule(schedule_id: int) -> dict[str, object]:
    with get_connection() as connection:
        row = _fetch_schedule(connection, schedule_id)

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule not found")

    return _schedule_from_row(row)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_schedule(payload: ScheduleCreate) -> dict[str, object]:
    title = _normalize_text(payload.title)
    schedule_type = _normalize_text(payload.type)
    location = _normalize_text(payload.location)
    memo = _normalize_text(payload.memo)
    status_value = _normalize_text(payload.status) or "confirmed"

    if title is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="title is required")

    if schedule_type is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="type is required")

    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_at must be after start_at")

    start_at = _normalize_datetime(payload.start_at)
    end_at = _normalize_datetime(payload.end_at)

    with get_connection() as connection:
        member = connection.execute(
            "SELECT id, is_active FROM members WHERE id = ?",
            (payload.member_id,),
        ).fetchone()
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
        if not bool(member["is_active"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="member is inactive")

        cursor = connection.execute(
            """
            INSERT INTO schedules (
              member_id, title, type, start_at, end_at, location, memo, all_day, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.member_id,
                title,
                schedule_type,
                start_at,
                end_at,
                location,
                memo,
                1 if payload.all_day else 0,
                status_value,
            ),
        )
        connection.commit()
        row = _fetch_schedule(connection, cursor.lastrowid)

    return _schedule_from_row(row)


@router.patch("/{schedule_id}")
def update_schedule(schedule_id: int, payload: ScheduleUpdate) -> dict[str, object]:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no fields to update")

    set_clauses: list[str] = []
    values: list[object] = []

    with get_connection() as connection:
        existing = _fetch_schedule(connection, schedule_id)
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule not found")

        next_start_at = existing["start_at"]
        next_end_at = existing["end_at"]

        for field_name, value in updates.items():
            if field_name == "member_id":
                if value is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="member_id is required")

                member = connection.execute(
                    "SELECT id, is_active FROM members WHERE id = ?",
                    (value,),
                ).fetchone()
                if member is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
                if not bool(member["is_active"]):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="member is inactive")
            elif field_name in {"title", "type"}:
                normalized_value = _normalize_text(value) if isinstance(value, str) or value is None else value
                if normalized_value is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{field_name} is required")
                value = normalized_value
            elif field_name in {"location", "memo"}:
                value = _normalize_text(value) if isinstance(value, str) or value is None else value
            elif field_name == "status":
                normalized_value = _normalize_text(value) if isinstance(value, str) or value is None else value
                if normalized_value is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status is required")
                value = normalized_value
            elif field_name in {"start_at", "end_at"}:
                if value is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{field_name} is required")
                value = _normalize_datetime(value)
            elif field_name == "all_day":
                value = 1 if value else 0

            if field_name == "start_at":
                next_start_at = value
            elif field_name == "end_at":
                next_end_at = value

            set_clauses.append(f"{field_name} = ?")
            values.append(value)

        if next_end_at <= next_start_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_at must be after start_at")

        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        values.append(schedule_id)

        cursor = connection.execute(
            f"""
            UPDATE schedules
            SET {', '.join(set_clauses)}
            WHERE id = ?
            """,
            tuple(values),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule not found")
        connection.commit()
        row = _fetch_schedule(connection, schedule_id)

    return _schedule_from_row(row)


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int) -> dict[str, object]:
    with get_connection() as connection:
        row = _fetch_schedule(connection, schedule_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="schedule not found")

        connection.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        connection.commit()

    return _schedule_from_row(row)
