from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, max_length=100)


class MemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, max_length=100)


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    department: str | None = None
    role: str | None = None
    is_active: bool
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MemberSummary(BaseModel):
    id: int
    name: str
    department: str | None = None
    role: str | None = None
    is_active: bool


class ScheduleCreate(BaseModel):
    member_id: int
    title: str = Field(min_length=1, max_length=200)
    type: str = Field(min_length=1, max_length=50)
    start_at: datetime
    end_at: datetime
    location: str | None = Field(default=None, max_length=200)
    memo: str | None = Field(default=None, max_length=1000)
    all_day: bool = False
    status: str = Field(default="confirmed", max_length=30)


class ScheduleUpdate(BaseModel):
    member_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    type: str | None = Field(default=None, min_length=1, max_length=50)
    start_at: datetime | None = None
    end_at: datetime | None = None
    location: str | None = Field(default=None, max_length=200)
    memo: str | None = Field(default=None, max_length=1000)
    all_day: bool | None = None
    status: str | None = Field(default=None, max_length=30)


class ScheduleOut(BaseModel):
    id: int
    member_id: int
    title: str
    type: str
    start_at: datetime
    end_at: datetime
    location: str | None = None
    memo: str | None = None
    all_day: bool
    status: str
    created_at: datetime
    updated_at: datetime
    member: MemberSummary | None = None
