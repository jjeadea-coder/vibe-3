/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createMember,
  createSchedule,
  deleteMember,
  deleteSchedule,
  listMembers,
  listSchedules,
  updateMember,
  updateSchedule,
  type Member,
  type ScheduleItem,
} from "../shared/api/schedule";

const scheduleTypes = ["근무", "휴가", "출장", "회의", "교육", "기타"];
const scheduleStatuses = ["확정", "임시", "취소"];

type ViewMode = "week" | "month";

type MemberFormState = {
  name: string;
  department: string;
  role: string;
};

type ScheduleFormState = {
  memberId: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  location: string;
  memo: string;
  allDay: boolean;
  status: string;
};

type FeedbackState = {
  kind: "success" | "error";
  message: string;
};

type RangeInfo = {
  from: string;
  to: string;
  label: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDateTimeValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseDateTime(value: string) {
  return new Date(value);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function monthGridStart(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getRangeInfo(viewMode: ViewMode, anchorDate: Date): RangeInfo {
  if (viewMode === "week") {
    const from = startOfWeek(anchorDate);
    const to = addDays(from, 7);
    const lastDay = addDays(to, -1);

    return {
      from: toApiDateTimeValue(from),
      to: toApiDateTimeValue(to),
      label: `${from.getFullYear()}년 ${from.getMonth() + 1}월 ${from.getDate()}일 - ${lastDay.getMonth() + 1}월 ${lastDay.getDate()}일`,
    };
  }

  const from = monthGridStart(anchorDate);
  const to = addDays(from, 42);
  return {
    from: toApiDateTimeValue(from),
    to: toApiDateTimeValue(to),
    label: `${anchorDate.getFullYear()}년 ${anchorDate.getMonth() + 1}월`,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseDateTime(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseDateTime(value));
}

function buildInitialScheduleForm(activeMemberId: number | null): ScheduleFormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    memberId: activeMemberId ? String(activeMemberId) : "",
    title: "",
    type: "근무",
    startAt: toDateTimeInputValue(start),
    endAt: toDateTimeInputValue(end),
    location: "",
    memo: "",
    allDay: false,
    status: "확정",
  };
}

function buildConflictIds(items: ScheduleItem[]) {
  const conflictIds = new Set<number>();

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const currentStart = parseDateTime(current.start_at).getTime();
    const currentEnd = parseDateTime(current.end_at).getTime();

    for (let compare = index + 1; compare < items.length; compare += 1) {
      const candidate = items[compare];
      if (candidate.member_id !== current.member_id) {
        continue;
      }

      const candidateStart = parseDateTime(candidate.start_at).getTime();
      const candidateEnd = parseDateTime(candidate.end_at).getTime();

      if (currentStart < candidateEnd && candidateStart < currentEnd) {
        conflictIds.add(current.id);
        conflictIds.add(candidate.id);
      }
    }
  }

  return conflictIds;
}

export function SchedulePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [memberForm, setMemberForm] = useState<MemberFormState>({ name: "", department: "", role: "" });
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() => buildInitialScheduleForm(null));
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(false);

  const activeMembers = useMemo(() => members.filter((member) => member.is_active), [members]);
  const selectedMember = useMemo(
    () => members.find((member) => String(member.id) === memberFilter) ?? null,
    [memberFilter, members],
  );
  const rangeInfo = useMemo(() => getRangeInfo(viewMode, anchorDate), [viewMode, anchorDate]);
  const visibleSchedules = useMemo(() => {
    if (memberFilter === "all") {
      return schedules;
    }

    return schedules.filter((schedule) => String(schedule.member_id) === memberFilter);
  }, [memberFilter, schedules]);
  const conflictIds = useMemo(() => buildConflictIds(visibleSchedules), [visibleSchedules]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate]);
  const monthDays = useMemo(() => {
    const start = monthGridStart(anchorDate);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [anchorDate]);
  const scheduleByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();

    for (const item of visibleSchedules) {
      const key = toLocalDateKey(parseDateTime(item.start_at));
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }

    for (const items of map.values()) {
      items.sort((left, right) => parseDateTime(left.start_at).getTime() - parseDateTime(right.start_at).getTime());
    }

    return map;
  }, [visibleSchedules]);
  const totalEvents = visibleSchedules.length;
  const activeCount = activeMembers.length;

  async function refreshMembers() {
    const items = await listMembers();
    setMembers(items);

    if (!scheduleForm.memberId) {
      const firstActive = items.find((member) => member.is_active);
      if (firstActive) {
        setScheduleForm((current) => (current.memberId ? current : { ...current, memberId: String(firstActive.id) }));
      }
    }
  }

  async function refreshAll(nextAnchor = anchorDate, nextViewMode = viewMode, nextMemberFilter = memberFilter) {
    setLoading(true);
    setFeedback(null);

    try {
      const range = getRangeInfo(nextViewMode, nextAnchor);
      const [memberItems, scheduleItems] = await Promise.all([
        listMembers(),
        listSchedules({
          from: range.from,
          to: range.to,
          memberId: nextMemberFilter === "all" ? "all" : Number(nextMemberFilter),
        }),
      ]);

      setMembers(memberItems);
      setSchedules(scheduleItems);

      if (!scheduleForm.memberId) {
        const firstActive = memberItems.find((member) => member.is_active);
        if (firstActive) {
          setScheduleForm((current) => (current.memberId ? current : { ...current, memberId: String(firstActive.id) }));
        }
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "일정 데이터를 불러오지 못했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refreshAll();
  }, [viewMode, anchorDate, memberFilter]);

  useEffect(() => {
    void refreshMembers().catch((error: unknown) => {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "팀원 목록을 불러오지 못했습니다.",
      });
    });
  }, []);

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm({ name: "", department: "", role: "" });
  }

  function resetScheduleForm() {
    const firstActive = activeMembers[0] ?? null;
    setEditingScheduleId(null);
    setScheduleForm(buildInitialScheduleForm(firstActive?.id ?? null));
  }

  function beginEditMember(member: Member) {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      department: member.department ?? "",
      role: member.role ?? "",
    });
  }

  function beginEditSchedule(schedule: ScheduleItem) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      memberId: String(schedule.member_id),
      title: schedule.title,
      type: schedule.type,
      startAt: toDateTimeInputValue(parseDateTime(schedule.start_at)),
      endAt: toDateTimeInputValue(parseDateTime(schedule.end_at)),
      location: schedule.location ?? "",
      memo: schedule.memo ?? "",
      allDay: schedule.all_day,
      status: schedule.status,
    });
  }
  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      const payload = {
        name: memberForm.name.trim(),
        department: memberForm.department.trim() || null,
        role: memberForm.role.trim() || null,
      };

      if (!payload.name) {
        throw new Error("팀원 이름을 입력하세요.");
      }

      if (editingMemberId === null) {
        await createMember(payload);
      } else {
        await updateMember(editingMemberId, payload);
      }

      resetMemberForm();
      await refreshAll();
      setFeedback({
        kind: "success",
        message: editingMemberId === null ? "팀원을 등록했습니다." : "팀원 정보를 수정했습니다.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "팀원 저장에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleMemberDelete(member: Member) {
    if (!window.confirm(`팀원 '${member.name}'을(를) 비활성화할까요?`)) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await deleteMember(member.id);
      if (editingMemberId === member.id) {
        resetMemberForm();
      }
      await refreshAll();
      setFeedback({ kind: "success", message: "팀원을 비활성화했습니다." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "팀원 삭제에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      const memberId = Number(scheduleForm.memberId);
      if (!Number.isFinite(memberId) || memberId <= 0) {
        throw new Error("일정을 연결할 팀원을 선택하세요.");
      }

      const payload = {
        member_id: memberId,
        title: scheduleForm.title.trim(),
        type: scheduleForm.type.trim(),
        start_at: scheduleForm.startAt,
        end_at: scheduleForm.endAt,
        location: scheduleForm.location.trim() || null,
        memo: scheduleForm.memo.trim() || null,
        all_day: scheduleForm.allDay,
        status: scheduleForm.status.trim(),
      };

      if (!payload.title) {
        throw new Error("일정 제목을 입력하세요.");
      }

      if (!payload.type) {
        throw new Error("일정 유형을 입력하세요.");
      }

      if (editingScheduleId === null) {
        await createSchedule(payload);
      } else {
        await updateSchedule(editingScheduleId, payload);
      }

      resetScheduleForm();
      await refreshAll();
      setFeedback({
        kind: "success",
        message: editingScheduleId === null ? "일정을 등록했습니다." : "일정을 수정했습니다.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "일정 저장에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleDelete(schedule: ScheduleItem) {
    if (!window.confirm(`일정 '${schedule.title}'을(를) 삭제할까요?`)) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await deleteSchedule(schedule.id);
      if (editingScheduleId === schedule.id) {
        resetScheduleForm();
      }
      await refreshAll();
      setFeedback({ kind: "success", message: "일정을 삭제했습니다." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "일정 삭제에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  function moveAnchor(direction: -1 | 1) {
    setAnchorDate((current) => (viewMode === "week" ? addDays(current, direction * 7) : addMonths(current, direction)));
  }

  function jumpToToday() {
    setAnchorDate(new Date());
  }

  const activeSummary = activeCount === members.length ? `${activeCount}명 활성` : `${activeCount}/${members.length}명 활성`;

  return (
    <div className="schedule-page">
      <header className="page-header">
        <div>
          <p className="section-kicker">Team Schedule Management</p>
          <h2>팀원 일정 관리</h2>
          <p className="description">
            팀원을 직접 관리하고, 일정을 등록한 뒤 주간 표와 월간 캘린더로 나누어 확인할 수 있습니다.
          </p>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <span>전체 팀원</span>
            <strong>{members.length}명</strong>
          </div>
          <div className="summary-card">
            <span>활성 팀원</span>
            <strong>{activeSummary}</strong>
          </div>
          <div className="summary-card">
            <span>표시 일정</span>
            <strong>{totalEvents}건</strong>
          </div>
        </div>
      </header>

      {feedback ? <div className={`notice ${feedback.kind}`}>{feedback.message}</div> : null}
      {loading ? <div className="notice">저장 중...</div> : null}

      <section className="schedule-shell">
        <div className="panel form-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Member Admin</p>
              <h3>{editingMemberId === null ? "팀원 등록" : "팀원 수정"}</h3>
            </div>
            <button className="ghost-button" type="button" onClick={resetMemberForm}>
              초기화
            </button>
          </div>
          <form className="form-grid" onSubmit={handleMemberSubmit}>
            <label className="field">
              <span>이름</span>
              <input
                value={memberForm.name}
                onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="예: 김민수"
              />
            </label>
            <label className="field">
              <span>부서</span>
              <input
                value={memberForm.department}
                onChange={(event) => setMemberForm((current) => ({ ...current, department: event.target.value }))}
                placeholder="예: 민원행정과"
              />
            </label>
            <label className="field field-wide">
              <span>직책</span>
              <input
                value={memberForm.role}
                onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}
                placeholder="예: 주무관"
              />
            </label>
            <div className="button-row field-wide">
              <button className="primary-button" type="submit">
                {editingMemberId === null ? "팀원 등록" : "팀원 저장"}
              </button>
            </div>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>부서</th>
                  <th>직책</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      아직 등록된 팀원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className={member.is_active ? "" : "muted-row"}>
                      <td>
                        <strong>{member.name}</strong>
                      </td>
                      <td>{member.department ?? "-"}</td>
                      <td>{member.role ?? "-"}</td>
                      <td>
                        <span className={member.is_active ? "status-pill active" : "status-pill inactive"}>
                          {member.is_active ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          <button className="ghost-button" type="button" onClick={() => beginEditMember(member)}>
                            수정
                          </button>
                          <button className="danger-button" type="button" onClick={() => handleMemberDelete(member)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Schedule Admin</p>
              <h3>{editingScheduleId === null ? "일정 등록" : "일정 수정"}</h3>
            </div>
            <button className="ghost-button" type="button" onClick={resetScheduleForm}>
              초기화
            </button>
          </div>

          <form className="form-grid schedule-form" onSubmit={handleScheduleSubmit}>
            <label className="field field-wide">
              <span>연결 팀원</span>
              <select
                value={scheduleForm.memberId}
                onChange={(event) => setScheduleForm((current) => ({ ...current, memberId: event.target.value }))}
              >
                <option value="">팀원 선택</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.is_active ? "" : " (비활성)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>제목</span>
              <input
                value={scheduleForm.title}
                onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="예: 민원 응대 회의"
              />
            </label>
            <label className="field">
              <span>유형</span>
              <select
                value={scheduleForm.type}
                onChange={(event) => setScheduleForm((current) => ({ ...current, type: event.target.value }))}
              >
                {scheduleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>상태</span>
              <select
                value={scheduleForm.status}
                onChange={(event) => setScheduleForm((current) => ({ ...current, status: event.target.value }))}
              >
                {scheduleStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>시작</span>
              <input
                type="datetime-local"
                value={scheduleForm.startAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, startAt: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>종료</span>
              <input
                type="datetime-local"
                value={scheduleForm.endAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, endAt: event.target.value }))}
              />
            </label>
            <label className="field field-wide">
              <span>장소</span>
              <input
                value={scheduleForm.location}
                onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="예: 3층 회의실"
              />
            </label>
            <label className="field field-wide">
              <span>메모</span>
              <textarea
                value={scheduleForm.memo}
                onChange={(event) => setScheduleForm((current) => ({ ...current, memo: event.target.value }))}
                rows={4}
                placeholder="일정에 대한 세부 메모"
              />
            </label>
            <label className="inline-switch field-wide">
              <input
                type="checkbox"
                checked={scheduleForm.allDay}
                onChange={(event) => setScheduleForm((current) => ({ ...current, allDay: event.target.checked }))}
              />
              <span>종일 일정</span>
            </label>
            <div className="button-row field-wide">
              <button className="primary-button" type="submit">
                {editingScheduleId === null ? "일정 등록" : "일정 저장"}
              </button>
            </div>
          </form>

          <div className="toolbar">
            <div className="toggle-group" role="tablist" aria-label="일정 보기 전환">
              <button
                type="button"
                className={viewMode === "week" ? "active" : ""}
                onClick={() => setViewMode("week")}
              >
                주간 보기
              </button>
              <button
                type="button"
                className={viewMode === "month" ? "active" : ""}
                onClick={() => setViewMode("month")}
              >
                월간 보기
              </button>
            </div>
            <div className="toolbar-actions">
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
                <option value="all">전체 팀원</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={toLocalDateKey(anchorDate)}
                onChange={(event) => {
                  if (event.target.value) {
                    setAnchorDate(startOfDay(new Date(`${event.target.value}T00:00:00`)));
                  }
                }}
              />
              <button className="ghost-button" type="button" onClick={() => moveAnchor(-1)}>
                이전
              </button>
              <button className="ghost-button" type="button" onClick={jumpToToday}>
                오늘
              </button>
              <button className="ghost-button" type="button" onClick={() => moveAnchor(1)}>
                다음
              </button>
            </div>
          </div>

          <div className="range-banner">
            <div>
              <p className="section-kicker">Current Range</p>
              <h3>{viewMode === "week" ? "주간 일정" : "월간 일정"}</h3>
            </div>
            <strong>{rangeInfo.label}</strong>
          </div>
          {viewMode === "week" ? (
            <div className="week-board">
              <div className="week-header">
                {weekDays.map((day) => (
                  <div key={toLocalDateKey(day)} className="week-header-cell">
                    <span>{new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(day)}</span>
                    <strong>{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(day)}</strong>
                  </div>
                ))}
              </div>
              <div className="table-wrap">
                <table className="data-table week-table">
                  <thead>
                    <tr>
                      <th>일시</th>
                      <th>팀원</th>
                      <th>제목</th>
                      <th>유형</th>
                      <th>장소</th>
                      <th>상태</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          선택한 범위에 일정이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      visibleSchedules.map((schedule) => (
                        <tr key={schedule.id} className={conflictIds.has(schedule.id) ? "conflict-row" : ""}>
                          <td>
                            <div className="stacked-cell">
                              <strong>{formatDateTime(schedule.start_at)}</strong>
                              <span>~ {formatTime(schedule.end_at)}</span>
                            </div>
                          </td>
                          <td>{schedule.member?.name ?? "-"}</td>
                          <td>
                            <div className="stacked-cell">
                              <strong>{schedule.title}</strong>
                              {conflictIds.has(schedule.id) ? <span className="warning-text">충돌 가능</span> : null}
                            </div>
                          </td>
                          <td>{schedule.type}</td>
                          <td>{schedule.location ?? "-"}</td>
                          <td>
                            <span className={`status-pill ${schedule.status === "취소" ? "inactive" : "active"}`}>
                              {schedule.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-group">
                              <button className="ghost-button" type="button" onClick={() => beginEditSchedule(schedule)}>
                                수정
                              </button>
                              <button className="danger-button" type="button" onClick={() => handleScheduleDelete(schedule)}>
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="month-board">
              <div className="month-header">
                {Array.from({ length: 7 }, (_, index) => {
                  const day = addDays(startOfWeek(anchorDate), index);
                  return (
                    <div key={day.getDay()} className="month-weekday">
                      {new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(day)}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-grid">
                {monthDays.map((day) => {
                  const key = toLocalDateKey(day);
                  const daySchedules = scheduleByDay.get(key) ?? [];
                  const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
                  const isToday = key === toLocalDateKey(new Date());

                  return (
                    <div key={key} className={`calendar-cell ${isCurrentMonth ? "" : "outside"} ${isToday ? "today" : ""}`}>
                      <div className="calendar-cell-head">
                        <strong>{day.getDate()}</strong>
                        {daySchedules.length > 0 ? <span>{daySchedules.length}건</span> : null}
                      </div>
                      <div className="calendar-items">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <button
                            key={schedule.id}
                            type="button"
                            className={`calendar-item ${conflictIds.has(schedule.id) ? "conflict" : ""}`}
                            onClick={() => beginEditSchedule(schedule)}
                          >
                            <span className="calendar-item-time">{schedule.all_day ? "종일" : formatTime(schedule.start_at)}</span>
                            <span className="calendar-item-title">{schedule.title}</span>
                          </button>
                        ))}
                        {daySchedules.length > 3 ? <span className="calendar-more">+ {daySchedules.length - 3}개 더보기</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="page-footer">
        <span>선택된 팀원: {selectedMember?.name ?? "전체"}</span>
        <span>표시 범위: {rangeInfo.label}</span>
      </footer>
    </div>
  );
}










