import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function ChatbotPage() {
  return (
    <FeatureScaffold
      title="민원 대응 챗봇"
      description="첨부된 민원 매뉴얼을 근거로 대응 방향과 답변 초안을 작성하는 모듈입니다."
      items={["매뉴얼 업로드", "민원 내용 입력", "답변 초안 생성", "근거 문서 표시"]}
    />
  );
}
