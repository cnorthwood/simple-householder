import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_OPTIONS, household, type HouseholdOptions } from '../core/household';
import type { ParsedExport } from '../core/parseExport';
import { CheckStep } from './CheckStep';
import { DownloadStep } from './DownloadStep';
import { ExportStep } from './ExportStep';
import { FileStep } from './FileStep';
import { Footer } from './Footer';
import { StepIndicator, STEPS, type StepId } from './StepIndicator';

export function App() {
  const [step, setStep] = useState<StepId>('export');
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [options, setOptions] = useState<HouseholdOptions>(DEFAULT_OPTIONS);
  const mainRef = useRef<HTMLElement>(null);

  // Move focus to the new step's heading so screen readers announce it, and name the step in
  // the page title (WCAG 2.4.2).
  useEffect(() => {
    const heading = mainRef.current?.querySelector('h2');
    heading?.focus();
    document.title = `${heading?.textContent ?? STEPS.find((s) => s.id === step)?.label} – Simple Householder`;
  }, [step]);

  const result = useMemo(
    () => (parsed ? household(parsed.electors, options) : null),
    [parsed, options],
  );

  const startAgain = () => {
    setParsed(null);
    setOptions(DEFAULT_OPTIONS);
    setStep('export');
  };

  return (
    <>
      <header class="site-header">
        <div class="container">
          <h1>Simple Householder</h1>
          <p class="tagline">
            One letter per household, with every elector named, ready for your printer.
          </p>
        </div>
      </header>
      <main class="container" ref={mainRef}>
        <StepIndicator current={step} />
        {step === 'export' && <ExportStep onNext={() => setStep('file')} />}
        {step === 'file' && (
          <FileStep
            previous={parsed}
            onContinue={() => setStep('check')}
            onBack={() => setStep('export')}
            onLoaded={(p) => {
              setParsed(p);
              setStep('check');
            }}
          />
        )}
        {step === 'check' && parsed && result && (
          <CheckStep
            parsed={parsed}
            result={result}
            options={options}
            onOptionsChange={setOptions}
            onBack={() => setStep('file')}
            onNext={() => setStep('download')}
          />
        )}
        {step === 'download' && parsed && result && (
          <DownloadStep
            parsed={parsed}
            result={result}
            options={options}
            onBack={() => setStep('check')}
            onStartAgain={startAgain}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
