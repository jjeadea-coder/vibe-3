import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function NewsPage() {
  return (
    <FeatureScaffold
      title="뉴스 기사 수집"
      description="공공 행정 관련 뉴스를 매일 아침 수집하고 요약하는 모듈입니다."
      items={["키워드 기반 수집", "중복 기사 제거", "기사 요약", "북마크"]}
    />
  );
}
