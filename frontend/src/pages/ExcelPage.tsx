import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function ExcelPage() {
  return (
    <FeatureScaffold
      title="엑셀 업무 자동화"
      description="특정 컬럼을 기준으로 파일을 분리하거나 합치는 자동화 기능을 준비하는 영역입니다."
      items={["엑셀 업로드", "시트/컬럼 선택", "분리 및 병합 작업", "결과 파일 다운로드"]}
    />
  );
}
