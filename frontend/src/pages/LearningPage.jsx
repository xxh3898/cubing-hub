import { useMemo, useState } from 'react'
import { mockLearningCases, mockLearningTabs } from '../constants/mockLearning.js'
import { buildVisualCubeUrl } from '../utils/visualCube.js'

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState('F2L')

  const activeCases = useMemo(() => mockLearningCases[activeTab] ?? [], [activeTab])
  const activeTabMeta = useMemo(
    () => mockLearningTabs.find((tab) => tab.key === activeTab),
    [activeTab],
  )

  return (
    <section className="page-grid learning-page">
      <div className="panel learning-header-panel">
        <div className="learning-header-copy">
          <p className="eyebrow">Learning</p>
          <h2>학습</h2>
          <p className="helper-text">3x3x3 CFOP 해법을 `F2L`, `OLL`, `PLL` 흐름으로 정리한 학습 라이브러리입니다.</p>
        </div>
      </div>

      <div className="panel learning-library-panel">
        <div className="learning-tab-row" role="tablist" aria-label="Learning Tabs">
          {mockLearningTabs.map((tab) => (
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
            <h3>{activeTabMeta?.label ?? activeTab}</h3>
            <p className="helper-text">이미지와 회전기호를 함께 보며 바로 따라갈 수 있도록 구성했습니다.</p>
          </div>
        </div>

        <div className="learning-case-grid">
          {activeCases.map((item) => (
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
          ))}
        </div>
      </div>
    </section>
  )
}
