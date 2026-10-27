export interface DemoEvidence { id: string; home: string; stop: string; title: string; body: string; sourceType: 'hypothetical' | 'provider'; date: string | null }
export const DEMO_NOTE = '가상 예시: 솔안마을(가정)은 실존 지명이 아니며 모든 수치·상호는 가상의 관찰 주제입니다.';
export const DEMO_HOMES = [{ id: 'demo-a', name: '해뜰집', desc: '가상 1순위 후보' }, { id: 'demo-b', name: '달빛집', desc: '가상 비교 후보' }];
export const DEMO_EVIDENCE: DemoEvidence[] = [
  { id: 'ev-a1', home: 'demo-a', stop: 'around', title: '가상 골목 관찰 주제', body: '저녁 골목등 간격과 보행로 단차를 직접 확인할 주제.', sourceType: 'hypothetical', date: null },
  { id: 'ev-a2', home: 'demo-a', stop: 'route', title: '가상 생활동선 주제', body: '가정 역까지 도보 동선과 장보기 지점을 확인할 주제.', sourceType: 'hypothetical', date: null },
  { id: 'ev-a3', home: 'demo-a', stop: 'entrance', title: '가상 현관 관찰 주제', body: '현관 잠금·우편함·분리수거 위치를 확인할 주제.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b1', home: 'demo-b', stop: 'around', title: '가상 비교 관찰 주제', body: '달빛집 주변 밤 밝기 비교 관찰 주제.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b2', home: 'demo-b', stop: 'route', title: '가상 버스동선 주제', body: '버스 정류장까지 경사와 횡단보도 확인 주제.', sourceType: 'hypothetical', date: null },
  { id: 'ev-b3', home: 'demo-b', stop: 'entrance', title: '가상 건물입구 주제', body: '계단·엘리베이터 유무 확인 주제.', sourceType: 'hypothetical', date: null }
];