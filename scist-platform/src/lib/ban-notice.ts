/**
 * 停權的說法只寫這一份。密碼登入由 API 回這串字，Discord 登入與「用到一半被
 * 停權」則由登入視窗自己畫，兩邊要講一樣的話。
 */
export function bannedNotice(discordInvite?: string | null) {
  const invite = discordInvite?.trim();
  const help = invite ? "到 Discord（" + invite + "）找管理員說明情況" : "聯絡網站管理員說明情況";
  return "這個帳號已經被停權，目前沒辦法登入。如果覺得是誤會，請" + help + "。";
}
