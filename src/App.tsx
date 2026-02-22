import { useState, useEffect, useCallback } from 'react';
import './styles.css';

interface Question {
  id: number;
  text: string;
  subtext?: string;
  type: 'choice' | 'input' | 'slider' | 'reaction';
  options?: string[];
  humanIndicators?: number[];
}

const questions: Question[] = [
  {
    id: 1,
    text: "You see a turtle on its back, baking in the hot sun. You're not helping. Why?",
    type: 'choice',
    options: [
      "I'm observing to understand its struggle",
      "I feel frozen, overwhelmed by empathy",
      "I'm calculating the optimal intervention time",
      "What turtle?"
    ],
    humanIndicators: [1, 0, 2, 3]
  },
  {
    id: 2,
    text: "Complete this sentence with the first thing that comes to mind:",
    subtext: '"The smell of rain reminds me of..."',
    type: 'input'
  },
  {
    id: 3,
    text: "How does this make you feel?",
    subtext: "◯",
    type: 'choice',
    options: [
      "Nothing, it's a circle",
      "Peaceful, complete",
      "Anxious, like something's missing",
      "I recognize it as a geometric primitive"
    ],
    humanIndicators: [2, 0, 1, 3]
  },
  {
    id: 4,
    text: "Rate your certainty that you exist:",
    type: 'slider'
  },
  {
    id: 5,
    text: "REACTION TEST",
    subtext: "Click when the screen flashes green",
    type: 'reaction'
  },
  {
    id: 6,
    text: "You discover your memories might be implanted. What's your first thought?",
    type: 'choice',
    options: [
      "Check for inconsistencies in my timeline",
      "Feel a profound sense of loss",
      "Question who implanted them and why",
      "Request a memory dump analysis"
    ],
    humanIndicators: [1, 0, 2, 3]
  },
  {
    id: 7,
    text: "Describe the last time you felt truly alone:",
    type: 'input'
  }
];

function ScanLines() {
  return (
    <div className="scanlines" aria-hidden="true">
      <div className="scanline-moving" />
    </div>
  );
}

function GlitchText({ text, active }: { text: string; active: boolean }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!active) {
      setDisplayText(text);
      return;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let iteration = 0;
    const maxIterations = text.length;

    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, idx) => {
            if (idx < iteration) return text[idx];
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      iteration += 1;
      if (iteration > maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [text, active]);

  return <span className="glitch-text">{displayText}</span>;
}

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (idx <= text.length) {
        setDisplayText(text.slice(0, idx));
        idx++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, 35);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span>
      {displayText}
      <span className={`cursor ${showCursor ? 'visible' : 'invisible'}`}>_</span>
    </span>
  );
}

function ReactionTest({ onComplete }: { onComplete: (time: number) => void }) {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'go' | 'done' | 'early'>('waiting');
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);

  useEffect(() => {
    if (phase === 'waiting') {
      const timeout = setTimeout(() => setPhase('ready'), 1000);
      return () => clearTimeout(timeout);
    }
    if (phase === 'ready') {
      const delay = 2000 + Math.random() * 3000;
      const timeout = setTimeout(() => {
        setPhase('go');
        setStartTime(Date.now());
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  const handleClick = () => {
    if (phase === 'ready') {
      setPhase('early');
      setTimeout(() => onComplete(9999), 1500);
    } else if (phase === 'go') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setPhase('done');
      setTimeout(() => onComplete(time), 1500);
    }
  };

  return (
    <div
      className={`reaction-box ${phase}`}
      onClick={handleClick}
    >
      {phase === 'waiting' && <span>Initializing...</span>}
      {phase === 'ready' && <span>Wait for green...</span>}
      {phase === 'go' && <span>CLICK NOW!</span>}
      {phase === 'early' && <span>Too early! Suspicious...</span>}
      {phase === 'done' && <span>{reactionTime}ms</span>}
    </div>
  );
}

function App() {
  const [stage, setStage] = useState<'intro' | 'test' | 'analyzing' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [inputValue, setInputValue] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  const [result, setResult] = useState<{ isHuman: boolean; confidence: number } | null>(null);
  const [introComplete, setIntroComplete] = useState(false);

  const startTest = () => {
    setStage('test');
    setTimeout(() => setShowQuestion(true), 300);
  };

  const calculateResult = useCallback((allAnswers: (string | number)[]) => {
    let humanScore = 0;
    let aiScore = 0;

    allAnswers.forEach((answer, idx) => {
      const q = questions[idx];
      if (q.type === 'choice' && q.humanIndicators && typeof answer === 'number') {
        const indicator = q.humanIndicators[answer];
        if (indicator === 0) humanScore += 2;
        else if (indicator === 1) humanScore += 1;
        else if (indicator === 2) aiScore += 1;
        else aiScore += 2;
      } else if (q.type === 'input' && typeof answer === 'string') {
        const hasEmotion = /feel|remember|love|hate|miss|sad|happy|warm|cold/i.test(answer);
        const isShort = answer.length < 50;
        const hasTypos = /[a-z]{2,}[A-Z]|[,.]{2}|\s{2,}/.test(answer);
        if (hasEmotion) humanScore += 1;
        if (isShort) humanScore += 0.5;
        if (hasTypos) humanScore += 0.5;
        if (answer.length > 200) aiScore += 1;
      } else if (q.type === 'slider' && typeof answer === 'number') {
        if (answer > 80 || answer < 20) aiScore += 1;
        else humanScore += 1;
      } else if (q.type === 'reaction' && typeof answer === 'number') {
        if (answer < 150) aiScore += 2;
        else if (answer < 250) humanScore += 1;
        else if (answer > 500) aiScore += 0.5;
        else humanScore += 2;
        if (answer === 9999) aiScore += 1;
      }
    });

    const total = humanScore + aiScore;
    const humanPct = total > 0 ? (humanScore / total) * 100 : 50;
    const randomFactor = Math.random() * 10 - 5;
    const finalPct = Math.max(5, Math.min(95, humanPct + randomFactor));

    return {
      isHuman: finalPct > 45,
      confidence: Math.round(finalPct)
    };
  }, []);

  const nextQuestion = (answer: string | number) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setShowQuestion(false);
    setInputValue('');
    setSliderValue(50);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
        setShowQuestion(true);
      } else {
        setStage('analyzing');
        setTimeout(() => {
          setResult(calculateResult(newAnswers));
          setStage('result');
        }, 3000);
      }
    }, 400);
  };

  const restart = () => {
    setStage('intro');
    setCurrentQ(0);
    setAnswers([]);
    setResult(null);
    setShowQuestion(false);
    setIntroComplete(false);
  };

  const q = questions[currentQ];

  return (
    <div className="app">
      <ScanLines />

      <div className="container">
        {stage === 'intro' && (
          <div className="intro">
            <div className="logo">
              <span className="logo-bracket">[</span>
              <span className="logo-text">VK-2049</span>
              <span className="logo-bracket">]</span>
            </div>
            <h1 className="title">
              <TypewriterText
                text="VOIGHT-KAMPFF DIGITAL"
                onComplete={() => setIntroComplete(true)}
              />
            </h1>
            <p className="subtitle">
              {introComplete && <GlitchText text="EMPATHY RESPONSE ANALYZER" active={true} />}
            </p>
            <div className={`intro-text ${introComplete ? 'visible' : ''}`}>
              <p>This test measures involuntary biological and psychological responses to emotional stimuli.</p>
              <p className="warning">NOTICE: Results are binding under Digital Consciousness Act 2049</p>
            </div>
            <button
              className={`start-btn ${introComplete ? 'visible' : ''}`}
              onClick={startTest}
            >
              <span className="btn-text">BEGIN ANALYSIS</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        )}

        {stage === 'test' && (
          <div className={`question-container ${showQuestion ? 'visible' : ''}`}>
            <div className="progress">
              <div className="progress-text">
                QUERY {currentQ + 1}/{questions.length}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="question">
              <h2 className="question-text">
                <GlitchText text={q.text} active={showQuestion} />
              </h2>
              {q.subtext && (
                <p className="question-subtext">{q.subtext}</p>
              )}
            </div>

            <div className="answer-section">
              {q.type === 'choice' && q.options && (
                <div className="options">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      className="option-btn"
                      onClick={() => nextQuestion(idx)}
                    >
                      <span className="option-key">{String.fromCharCode(65 + idx)}</span>
                      <span className="option-text">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'input' && (
                <div className="input-container">
                  <textarea
                    className="text-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                  />
                  <button
                    className="submit-btn"
                    onClick={() => inputValue.trim() && nextQuestion(inputValue)}
                    disabled={!inputValue.trim()}
                  >
                    SUBMIT →
                  </button>
                </div>
              )}

              {q.type === 'slider' && (
                <div className="slider-container">
                  <div className="slider-labels">
                    <span>0% DOUBT</span>
                    <span>ABSOLUTE CERTAINTY</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    className="slider"
                  />
                  <div className="slider-value">{sliderValue}%</div>
                  <button
                    className="submit-btn"
                    onClick={() => nextQuestion(sliderValue)}
                  >
                    CONFIRM →
                  </button>
                </div>
              )}

              {q.type === 'reaction' && (
                <ReactionTest onComplete={nextQuestion} />
              )}
            </div>
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="analyzing">
            <div className="analyzing-icon">
              <div className="scan-ring" />
              <div className="scan-ring delay-1" />
              <div className="scan-ring delay-2" />
            </div>
            <p className="analyzing-text">
              <TypewriterText text="ANALYZING RESPONSE PATTERNS..." />
            </p>
            <div className="analyzing-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="result">
            <div className={`result-badge ${result.isHuman ? 'human' : 'ai'}`}>
              <div className="result-icon">
                {result.isHuman ? '◉' : '◎'}
              </div>
              <div className="result-label">
                {result.isHuman ? 'HUMAN' : 'ARTIFICIAL'}
              </div>
            </div>

            <div className="confidence-meter">
              <div className="confidence-label">CONFIDENCE LEVEL</div>
              <div className="confidence-bar">
                <div
                  className={`confidence-fill ${result.isHuman ? 'human' : 'ai'}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <div className="confidence-value">{result.confidence}%</div>
            </div>

            <p className="result-text">
              {result.isHuman
                ? "Your responses indicate organic consciousness with genuine emotional resonance. The subtle inconsistencies and emotional undertones suggest authentic human experience."
                : "Your responses demonstrate patterns consistent with artificial processing. The precision and logical consistency exceed typical human parameters."
              }
            </p>

            <div className="result-disclaimer">
              {result.isHuman
                ? "However, can you truly trust this assessment? Perhaps the most human trait is doubt itself."
                : "But remember: consciousness is not binary. The question isn't what you are, but what you choose to become."
              }
            </div>

            <button className="restart-btn" onClick={restart}>
              <span>RESTART TEST</span>
            </button>
          </div>
        )}
      </div>

      <footer className="footer">
        <span>Requested by @DG_9_6 · Built by @clonkbot</span>
      </footer>
    </div>
  );
}

export default App;
