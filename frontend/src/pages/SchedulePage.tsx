import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function SchedulePage() {
  return (
    <FeatureScaffold
      title="팀원 스케쥴 관리"
      description="휴가, 근무, 출장, 교육, 외근 일정을 공유하는 캘린더 모듈입니다."
      items={["월간/주간/일간 캘린더", "팀원별 필터", "일정 충돌 표시", "일정 CRUD API 연동 예정"]}
    />
  );
}
