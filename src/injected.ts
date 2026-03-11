import InjectedCommandHandler from "./injected-command-handler";

const handler = new InjectedCommandHandler();
document.addEventListener(`arqon-injected-script-command-request`, async (e: any) => {
  const command = e.detail.data;
  let handlerResponse = null;
  if (command.type in (handler as any)) {
    console.log("[Arqon Injected] handling command", command.type, command);
    handlerResponse = await (handler as any)[command.type](command);
  }
  console.log("[Arqon Injected] command response", command.type, handlerResponse);

  document.dispatchEvent(
    new CustomEvent(`arqon-injected-script-command-response`, {
      detail: {
        id: e.detail.id,
        data: handlerResponse,
      },
    })
  );
});
