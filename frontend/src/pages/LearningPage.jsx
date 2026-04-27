/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react'
import {
  beginnerCases,
  beginnerStepGuides,
  beginnerStepCompletions,
  beginnerSteps,
  mockLearningCases,
  mockLearningTabs,
} from '../constants/mockLearning.js'
import { buildVisualCubeUrl } from '../utils/visualCube.js'

const NOTATION_TAB_KEY = 'NOTATION'
const BEGINNER_TAB_KEY = 'BEGINNER'
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
  if (activeTab === BEGINNER_TAB_KEY) {
    return []
  }

  return isNotationTab ? notationGuides : mockLearningCases[activeTab] ?? []
}

export function getActiveTabLabel(activeTab) {
  return learningTabs.find((tab) => tab.key === activeTab)?.label ?? activeTab
}

function getLearningTabDescription(activeTab, isNotationTab) {
  if (isNotationTab) {
    return 'WCA 3x3x3 스크램블에서 실제로 보는 기본 표기만 VisualCube로 정리했습니다.'
  }

  if (activeTab === BEGINNER_TAB_KEY) {
    return '처음 맞추는 사용자가 따라가기 쉽도록 3x3x3 초보자 해법을 8단계로 정리했습니다.'
  }

  return '이미지와 회전기호를 함께 보며 바로 따라갈 수 있도록 구성했습니다.'
}

function getDisplayAlgorithms(item) {
  if (item.algorithms?.length) {
    return item.algorithms
  }

  return item.algorithm ? [{ sequence: item.algorithm }] : []
}

function getVisualAlgorithm(item) {
  return Object.prototype.hasOwnProperty.call(item, 'visualAlgorithm')
    ? item.visualAlgorithm
    : item.algorithm
}

function getBeginnerStepMeta(step) {
  return step.metaLabel ?? `${step.caseCount}가지 케이스`
}

function LearningCaseCard({ item, stage, className = '', visualAltSuffix = 'visual cube' }) {
  const displayAlgorithms = getDisplayAlgorithms(item)
  const shouldMaskThirdLayerEdges = item.visualMask === 'thirdLayerEdges'

  return (
    <article className={className ? `learning-case-card ${className}` : 'learning-case-card'}>
      <div className="learning-case-visual">
        <img
          src={buildVisualCubeUrl({
            puzzle: '3x3',
            algorithm: getVisualAlgorithm(item),
            faceletColors: item.visualFaceletColors,
            stage: item.stage ?? (item.visualFaceletColors ? '' : stage),
            view: item.visualView,
          })}
          alt={`${item.title ?? item.name} ${visualAltSuffix}`}
        />
        {shouldMaskThirdLayerEdges && (
          <svg
            className="learning-third-layer-edge-mask"
            aria-hidden="true"
            focusable="false"
            viewBox="-0.9 -0.9 1.8 1.8"
          >
            <polygon points="0.23200530924361,-0.64654708450724 0.44357407294753,-0.55500967942906 0.24823152717746,-0.45589370157761 0.03601776273158,-0.55500967942906" />
            <polygon points="-0.23200530924361,-0.64654708450724 -0.03601776273158,-0.55500967942906 -0.24823152717746,-0.45589370157761 -0.44357407294753,-0.55500967942906" />
            <polygon points="0.25135344771691,-0.4192120352454 0.48189555334352,-0.31153567271171 0.27050899589682,-0.1941398664099 0.03913968327103,-0.31153567271171" />
            <polygon points="-0.25135344771691,-0.4192120352454 -0.03913968327103,-0.31153567271171 -0.27050899589682,-0.1941398664099 -0.48189555334352,-0.31153567271171" />
            <polygon points="0.28930534489087,-0.16171652284677 0.50069190233757,-0.27911232914857 0.48317508531013,-0.019324131300046 0.27975556711438,0.10446714650317" />
            <polygon points="-0.50139487638912,-0.27854802283962 -0.29000831894242,-0.16115221653782 -0.28045854116593,0.10503145281212 -0.48387805936169,-0.018759824991097" />
          </svg>
        )}
      </div>
      <div className="learning-case-copy">
        <p className="learning-case-label">{item.name}</p>
        <h4>{item.title ?? item.id.toUpperCase()}</h4>
        {displayAlgorithms.length > 0 && (
          <div className="learning-algorithm-list">
            {displayAlgorithms.map((algorithm) => (
              <div className="learning-algorithm-item" key={`${item.id}-${algorithm.label ?? algorithm.sequence}`}>
                {algorithm.label && <span className="learning-algorithm-label">{algorithm.label}</span>}
                <code className="learning-algorithm">{algorithm.sequence}</code>
              </div>
            ))}
          </div>
        )}
        {item.description && <p className="helper-text">{item.description}</p>}
      </div>
    </article>
  )
}

function BeginnerGuideSection({ guides }) {
  if (!guides.length) {
    return null
  }

  return (
    <div className="learning-guide-section" aria-label="1단계 십자 맞추기 안내">
      {guides.map((guide, index) => (
        <article className="learning-guide-item" key={guide.id}>
          <div className="learning-guide-media">
            <img
              src={buildVisualCubeUrl({
                puzzle: '3x3',
                faceletColors: guide.visualFaceletColors,
                stage: guide.stage,
                view: guide.visualView,
              })}
              alt={`${guide.title} guide cube`}
            />
          </div>
          <div className="learning-guide-copy">
            <p className="learning-case-label">안내 {index + 1}</p>
            <h4>{guide.title}</h4>
            <p className="helper-text">{guide.description}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function BeginnerLearningSection({ selectedStepKey, onSelectStep, onBackToSteps }) {
  const selectedStepIndex = beginnerSteps.findIndex((step) => step.key === selectedStepKey)
  const selectedStep = selectedStepIndex >= 0 ? beginnerSteps[selectedStepIndex] : null
  const nextStep = selectedStepIndex >= 0 ? beginnerSteps[selectedStepIndex + 1] : null
  const selectedCases = selectedStep ? beginnerCases[selectedStep.key] : []
  const selectedCompletion = selectedStep ? beginnerStepCompletions[selectedStep.key] : null
  const selectedGuides = selectedStep ? beginnerStepGuides[selectedStep.key] ?? [] : []

  if (!selectedStep) {
    return (
      <div className="learning-step-grid" aria-label="초보자 단계 목록">
        {beginnerSteps.map((step) => (
          <button
            key={step.key}
            className="learning-step-card"
            type="button"
            aria-label={`${step.label} ${step.title} ${getBeginnerStepMeta(step)}`}
            onClick={() => onSelectStep(step.key)}
          >
            <span className="learning-step-label">{step.label}</span>
            <span className="learning-step-title">{step.title}</span>
            <span className="learning-step-meta">{getBeginnerStepMeta(step)}</span>
            <span className="helper-text">{step.description}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="learning-beginner-detail">
      <div className="learning-beginner-detail-header">
        <div className="learning-step-actions">
          <button className="ghost-button learning-step-back-button" type="button" onClick={onBackToSteps}>
            단계 목록
          </button>
          {nextStep && (
            <button
              className="primary-button learning-step-next-button"
              type="button"
              onClick={() => onSelectStep(nextStep.key)}
            >
              다음 단계 ({nextStep.label}: {nextStep.title})
            </button>
          )}
        </div>
        <div className="learning-step-summary">
          <p className="learning-case-label">{selectedStep.label}</p>
          <h4>{selectedStep.title}</h4>
          <p className="helper-text">{selectedStep.description}</p>
          {selectedStep.holdDescription && (
            <p className="learning-step-guide">{selectedStep.holdDescription}</p>
          )}
        </div>
      </div>
      <BeginnerGuideSection guides={selectedGuides} />
      {selectedCompletion && (
        <div className="learning-completion-section">
          <LearningCaseCard
            item={selectedCompletion}
            stage={selectedStep.key}
            className="learning-completion-card"
            visualAltSuffix="completion cube"
          />
        </div>
      )}
      {selectedCases.length > 0 && (
        <div className="learning-case-grid">
          {selectedCases.map((item) => (
            <LearningCaseCard key={item.id} item={item} stage={selectedStep.key} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState(NOTATION_TAB_KEY)
  const [selectedBeginnerStepKey, setSelectedBeginnerStepKey] = useState(null)
  const isNotationTab = activeTab === NOTATION_TAB_KEY
  const isBeginnerTab = activeTab === BEGINNER_TAB_KEY

  const activeCases = useMemo(
    () => getLearningCases(activeTab, isNotationTab),
    [activeTab, isNotationTab],
  )

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey)
    setSelectedBeginnerStepKey(null)
  }

  return (
    <section className="page-grid learning-page">
      <div className="panel learning-header-panel">
        <div className="learning-header-copy">
          <p className="eyebrow">Learning</p>
          <h2>학습</h2>
          <p className="helper-text">3x3x3 초보자 해법과 CFOP 케이스를 함께 정리한 학습 라이브러리입니다.</p>
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
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="learning-section-heading">
          <div>
            <h3>{getActiveTabLabel(activeTab)}</h3>
            <p className="helper-text">{getLearningTabDescription(activeTab, isNotationTab)}</p>
          </div>
        </div>

        {isBeginnerTab ? (
          <BeginnerLearningSection
            selectedStepKey={selectedBeginnerStepKey}
            onSelectStep={setSelectedBeginnerStepKey}
            onBackToSteps={() => setSelectedBeginnerStepKey(null)}
          />
        ) : (
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
                <LearningCaseCard key={item.id} item={item} stage={activeTab} />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
