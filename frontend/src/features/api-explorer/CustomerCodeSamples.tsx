import { useState } from "react";
import { SampleCode } from "./SampleCode";
import { CopyTextButton } from "./CopyTextButton";
import { getCodeSample, type SampleEndpoint, type SampleLanguage } from "./customerSamples";
import { selectedPreviewFields, type PreviewQuery } from "./catalog";

export function EndpointCodeSamples({ endpoint, query }: {
  endpoint: SampleEndpoint;
  query: PreviewQuery;
}) {
  const [language, setLanguage] = useState<SampleLanguage>("Python");
  const text = getCodeSample(
    endpoint,
    language,
    query.limit,
    query.order,
    query.number,
    selectedPreviewFields(query.fields),
  );
  return (
    <div className="customer-samples">
      <div className="preview-panel">
        <div className="preview-formats" role="group" aria-label="Bahasa contoh kode">
          {(["Python", "C#"] as const).map(option => (
            <button key={option} type="button" aria-pressed={language === option}
              onClick={() => setLanguage(option)}>{option}</button>
          ))}
        </div>
        <CopyTextButton key={text} text={text} label="Salin kode" />
        <pre className="preview-json" tabIndex={0} aria-label={`Contoh kode ${language}`}><SampleCode language={language} text={text} /></pre>
      </div>
    </div>
  );
}
