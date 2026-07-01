import { FeatureScaffold } from "../shared/components/FeatureScaffold";

export function ExcelPage() {
  return (
    <FeatureScaffold
      title="엑셀 업무 자동화"
      description="기준 컬럼으로 엑셀을 나누거나 여러 엑셀 파일을 병합하는 모듈입니다."
      items={["파일 업로드", "시트/컬럼 선택", "분리 및 병합 작업", "결과 파일 다운로드"]}
    />
  );
}
