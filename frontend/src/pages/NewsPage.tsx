import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function NewsPage() {
  return (
    <FeatureScaffold
      title="뉴스 기사 수집"
      description="공공 행정 관련 뉴스를 아침마다 자동으로 수집하고 요약하는 영역입니다."
      items={["키워드 설정", "수집 스케줄", "중복 기사 제거", "요약 및 목록 보기"]}
    />
  );
}
