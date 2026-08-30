import PlanSteps from "./PlanSteps";


export default function ChatMessage({
  message,
}) {
  const isUser =
    message.role === "user";

  return (
    <div
      className={
        `message-row ${
          isUser
            ? "user"
            : "assistant"
        }`
      }
    >
      <div className="message-content">
        <div className="message-author">
          {isUser
            ? "Você"
            : "Kynka"}
        </div>

        <div className="message-bubble">
          <div className="message-text">
            {message.error
              ? `Erro: ${message.error}`
              : String(message.content)}
          </div>

          {!isUser && message.mode && (
            <div className="message-meta">
              {message.mode === "plan"
                ? "Execução planejada"
                : (
                  message.capability
                  || "Execução simples"
                )}
            </div>
          )}

          <PlanSteps
            steps={message.steps}
          />
        </div>
      </div>
    </div>
  );
}

