/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react'
import { mockLearningCases, mockLearningTabs } from '../constants/mockLearning.js'
import { buildVisualCubeUrl } from '../utils/visualCube.js'

const NOTATION_TAB_KEY = 'NOTATION'
const learningTabs = [
  { key: NOTATION_TAB_KEY, label: '회전기호 가이드' },
  ...mockLearningTabs,
]
const notationFaces = [
  { symbol: 'U', label: '윗면', faceName: '상' },
  { symbol: 'D', label: '아랫면', faceName: '하' },
  { symbol: 'L', label: '왼쪽 면', faceName: '좌' },
  { symbol: 'R', label: '오른쪽 면', faceName: '우' },
  { symbol: 'F', label: '앞면', faceName: '전' },
  { symbol: 'B', label: '뒷면', faceName: '후' },
]
const notationGuides = notationFaces.flatMap((face) => [
  {
    key: `${face.symbol}-clockwise`,
    symbol: face.symbol,
    label: face.label,
    title: `${face.faceName}(${face.symbol})`,
    description: `${face.label}을 시계 방향으로 90도 돌립니다.`,
  },
  {
    key: `${face.symbol}-prime`,
    symbol: `${face.symbol}'`,
    label: face.label,
    title: `${face.faceName}'(${face.symbol}')`,
    description: `${face.label}을 반시계 방향으로 90도 돌립니다.`,
  },
  {
    key: `${face.symbol}-double`,
    symbol: `${face.symbol}2`,
    label: face.label,
    title: `${face.faceName}2(${face.symbol}2)`,
    description: `${face.label}을 180도 돌립니다.`,
  },
])

export function getLearningCases(activeTab, isNotationTab) {
  return isNotationTab ? notationGuides : mockLearningCases[activeTab] ?? []
}

export function getActiveTabLabel(activeTab) {
  return learningTabs.find((tab) => tab.key === activeTab)?.label ?? activeTab
}

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState(NOTATION_TAB_KEY)
  const isNotationTab = activeTab === NOTATION_TAB_KEY

  const activeCases = useMemo(
    () => getLearningCases(activeTab, isNotationTab),
    [activeTab, isNotationTab],
  )

  return (
    <section className="page-grid learning-page">
      <div className="panel learning-header-panel">
        <div className="learning-header-copy">
          <p className="eyebrow">Learning</p>
          <h2>학습</h2>
          <p className="helper-text">3x3x3 CFOP 해법을 F2L -&gt; OLL -&gt; PLL 흐름으로 정리한 학습 라이브러리입니다.</p>
        </div>
      </div>

      <div className="panel learning-library-panel">
        <div className="learning-tab-row" role="tablist" aria-label="Learning Tabs">
          {learningTabs.map((tab) => (
            <button
              key={tab.key}
              className={tab.key === activeTab ? 'primary-button learning-tab-button' : 'ghost-button learning-tab-button'}
              type="button"
              role="tab"
              aria-selected={tab.key === activeTab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="learning-section-heading">
          <div>
            <h3>{getActiveTabLabel(activeTab)}</h3>
            <p className="helper-text">
              {isNotationTab
                ? 'WCA 3x3x3 스크램블에서 실제로 보는 기본 표기만 VisualCube로 정리했습니다.'
                : '이미지와 회전기호를 함께 보며 바로 따라갈 수 있도록 구성했습니다.'}
            </p>
          </div>
        </div>

        <div className="learning-case-grid">
          {activeCases.map((item) =>
            isNotationTab ? (
              <article key={item.key} className="learning-case-card learning-notation-card">
                <div className="learning-case-visual learning-notation-visual">
                  <img
                    src={buildVisualCubeUrl({
                      puzzle: '3x3',
                      algorithm: item.symbol,
                      stateType: 'alg',
                    })}
                    alt={`${item.symbol} visual cube`}
                  />
                </div>
                <div className="learning-case-copy">
                  <p className="learning-case-label">{item.label}</p>
                  <h4>{item.title}</h4>
                  <code className="learning-algorithm">{item.symbol}</code>
                  <p className="helper-text">{item.description}</p>
                </div>
              </article>
            ) : (
              <article key={item.id} className="learning-case-card">
                <div className="learning-case-visual">
                  <img
                    src={buildVisualCubeUrl({
                      puzzle: '3x3',
                      algorithm: item.algorithm,
                      stage: activeTab,
                    })}
                    alt={`${item.name} visual cube`}
                  />
                </div>
                <div className="learning-case-copy">
                  <p className="learning-case-label">{item.name}</p>
                  <h4>{item.id.toUpperCase()}</h4>
                  <code className="learning-algorithm">{item.algorithm}</code>
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
