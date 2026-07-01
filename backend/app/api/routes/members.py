from fastapi import APIRouter, HTTPException, status

from app.api.schemas import MemberCreate, MemberUpdate
from app.core.database import get_connection

router = APIRouter(prefix="/members", tags=["members"])


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _member_from_row(row) -> dict[str, object]:
    return {
        "id": row["id"],
        "name": row["name"],
        "department": row["department"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "deleted_at": row["deleted_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.get("")
def list_members(active_only: bool = False) -> dict[str, list[dict[str, object]]]:
    with get_connection() as connection:
        if active_only:
            rows = connection.execute(
                """
                SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
                FROM members
                WHERE is_active = 1
                ORDER BY name COLLATE NOCASE ASC, id ASC
                """
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
                FROM members
                ORDER BY is_active DESC, name COLLATE NOCASE ASC, id ASC
                """
            ).fetchall()

    return {"items": [_member_from_row(row) for row in rows]}


@router.get("/{member_id}")
def get_member(member_id: int) -> dict[str, object]:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
            FROM members
            WHERE id = ?
            """,
            (member_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")

    return _member_from_row(row)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_member(payload: MemberCreate) -> dict[str, object]:
    name = _normalize_text(payload.name)
    department = _normalize_text(payload.department)
    role = _normalize_text(payload.role)

    if name is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name is required")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO members (name, department, role)
            VALUES (?, ?, ?)
            """,
            (name, department, role),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
            FROM members
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

    return _member_from_row(row)


@router.patch("/{member_id}")
def update_member(member_id: int, payload: MemberUpdate) -> dict[str, object]:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no fields to update")

    set_clauses: list[str] = []
    values: list[object] = []

    for field_name, value in updates.items():
        if field_name in {"name", "department", "role"}:
            normalized_value = _normalize_text(value) if isinstance(value, str) or value is None else value
            if field_name == "name" and normalized_value is None:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name is required")
            value = normalized_value

        set_clauses.append(f"{field_name} = ?")
        values.append(value)

    set_clauses.append("updated_at = CURRENT_TIMESTAMP")
    values.append(member_id)

    with get_connection() as connection:
        cursor = connection.execute(
            f"""
            UPDATE members
            SET {', '.join(set_clauses)}
            WHERE id = ?
            """,
            tuple(values),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
        connection.commit()
        row = connection.execute(
            """
            SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
            FROM members
            WHERE id = ?
            """,
            (member_id,),
        ).fetchone()

    return _member_from_row(row)


@router.delete("/{member_id}")
def delete_member(member_id: int) -> dict[str, object]:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE members
            SET is_active = 0,
                deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (member_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
        connection.commit()
        row = connection.execute(
            """
            SELECT id, name, department, role, is_active, deleted_at, created_at, updated_at
            FROM members
            WHERE id = ?
            """,
            (member_id,),
        ).fetchone()

    return _member_from_row(row)
