/** Evita trocar o mesmo tíquete do Google duas vezes (o app pode receber o link de retorno por dois caminhos). */
const handled = new Set<string>();

/** Devolve `true` apenas na primeira vez que o tíquete é reivindicado. */
export function claimGoogleTicket(ticket: string): boolean {
  if (handled.has(ticket)) return false;
  handled.add(ticket);
  return true;
}

export function wasGoogleTicketHandled(ticket: string): boolean {
  return handled.has(ticket);
}

export const GOOGLE_APP_REDIRECT = "conectabarra://google-auth";

export const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "O login Google ainda não foi ativado no servidor. Entre com usuário e senha ou avise a gestão.",
  cancelled: "O login com Google foi cancelado.",
  redirect_uri_mismatch: "O endereço de retorno do Google não está cadastrado no Google Cloud. Avise a gestão do aplicativo.",
  invalid_client: "O segredo do cliente Google configurado no servidor está incorreto. Avise a gestão do aplicativo.",
  state: "A solicitação expirou. Toque em “Continuar com Google” novamente.",
  rejected: "Não foi possível concluir o cadastro com essa conta Google. Tente novamente.",
};
