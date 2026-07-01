import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function ChatbotPage() {
  return (
    <FeatureScaffold
      title="민원 대응 챗봇"
      description="첨부된 민원 메뉴얼을 바탕으로 응대 스크립트와 답변 초안을 생성하는 영역입니다."
      items={["메뉴얼 업로드", "민원 내용 입력", "답변 초안 생성", "근거 문서 표시"]}
    />
  );
}
