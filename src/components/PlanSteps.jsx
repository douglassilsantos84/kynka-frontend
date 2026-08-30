export default function PlanSteps({ steps }) {
  if (!steps?.length) {
    return null;
  }

  return (
    <div className="plan">
      <div className="plan-title">Plano executado</div>

      {steps.map((step) => (
        <div className="plan-step" key={step.step_id}>
          <div className="plan-step-status">
            {step.success ? "✓" : "×"}
          </div>

          <div>
            <div className="plan-step-name">
              {step.step_id} · {step.capability}
            </div>

            <div className="plan-step-result">
              {step.success
                ? `Resultado: ${String(step.result)}`
                : `Erro: ${step.error}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}