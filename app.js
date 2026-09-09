// Google OAuth 2.0 Client ID from Google Cloud.
const GOOGLE_CLIENT_ID = "679009305083-pq22t40sf6p2r2f20rkv14imdu128cf6.apps.googleusercontent.com";
// Replace this with the ID from your Google Sheet URL.
const GOOGLE_SHEET_ID = "12d7oiNkhWP8XOA_o8hAveLrJBfgPpmUAfkjJgnr5CRo";
// Change this only if your worksheet tab has a different name.
const GOOGLE_SHEET_TAB = "AhmadSyahmi_Assesment_Sheet";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const statusElement = document.querySelector("#status");
const googleButton = document.querySelector("#google-button");
const fallbackButton = document.querySelector("#manual-login");
const loadSheetButton = document.querySelector("#load-sheet");
const profileElement = document.querySelector("#profile");
let tokenClient;

function setStatus(message, type = "") { statusElement.textContent = message; statusElement.className = `status ${type}`; }

function showProfile(profile) {
  document.querySelector("#profile-picture").src = profile.picture || "";
  document.querySelector("#profile-name").textContent = profile.name || "Signed-in user";
  document.querySelector("#profile-email").textContent = profile.email || "";
  profileElement.hidden = false;
}

function decodeJwtPayload(token) {
  if (typeof token !== "string") throw new Error("Google did not return a credential token.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Google returned an invalid credential token.");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  return JSON.parse(new TextDecoder("utf-8").decode(bytes));
}

function renderRows(rows) {
  const body = document.querySelector("#data-body");
  body.innerHTML = rows.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${row.age}</td><td>${escapeHtml(row.country)}</td><td>${escapeHtml(row.interest)}</td><td>${formatCurrency(row.netWorth)}</td></tr>`).join("");
  document.querySelector("#record-count").textContent = `${rows.length} records`;
  document.querySelector("#data-panel").hidden = false;
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[character])); }
function formatCurrency(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function parseMoney(value) { return Number(String(value ?? "").replace(/[$,\s]/g, "")) || 0; }

async function loadSheetData(accessToken) {
  if (GOOGLE_SHEET_ID.includes("PASTE_YOUR")) throw new Error("Add your Google Sheet ID in app.js first.");
  async function readRange(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  let result = await readRange(`${GOOGLE_SHEET_TAB}!A:F`);
  // If the visible tab name is slightly different, fall back to columns A:F of the first tab.
  if (!result.response.ok && result.response.status === 400) result = await readRange("A:F");
  const { response, payload } = result;
  if (!response.ok) {
    const detail = payload?.error?.message || "No additional error details were returned.";
    throw new Error(`Google Sheets returned ${response.status}: ${detail}`);
  }
  const values = payload.values || [];
  const [, ...records] = values;
  const rows = records.filter(row => row[0]).map(row => ({ name: row[0], photo: row[1], age: Number(row[2]) || 0, country: row[3] || "", interest: row[4] || "", netWorth: parseMoney(row[5]) }));
  renderRows(rows);
  window.dispatchEvent(new CustomEvent("sheet-data-loaded", { detail: rows }));
  setStatus(`Loaded ${rows.length} records from Google Sheets.`, "success");
}

function requestSheetAccess() {
  if (!window.google?.accounts?.oauth2) throw new Error("Google authorization library is still loading.");
  tokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: SHEETS_SCOPE, callback: async response => {
    if (response.error) {
      const detail = response.error_description ? `: ${response.error_description}` : "";
      setStatus(`Sheet permission failed: ${response.error}${detail}`, "error");
      return;
    }
    try { setStatus("Reading your Google Sheet..."); await loadSheetData(response.access_token); }
    catch (error) { console.error("Google Sheet loading failed:", error); setStatus(error.message, "error"); }
  }});
  tokenClient.requestAccessToken({ prompt: "consent" });
}

function handleCredentialResponse(response) {
  try { if (!response?.credential) throw new Error("Google did not return a credential."); showProfile(decodeJwtPayload(response.credential)); loadSheetButton.style.display = "inline-block"; setStatus("Login successful. Click Load Google Sheet to continue."); }
  catch (error) { console.error("Google login processing failed:", error, response); setStatus(`Login failed: ${error.message}`, "error"); }
}

function initialiseGoogleLogin() {
  if (!window.google?.accounts?.id) { setStatus("Google login library is still loading. Refresh if this does not change."); return; }
  if (GOOGLE_CLIENT_ID.includes("PASTE_YOUR")) { googleButton.hidden = true; fallbackButton.style.display = "block"; setStatus("Add your Google OAuth Client ID in app.js to activate login."); return; }
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
  google.accounts.id.renderButton(googleButton, { theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 260 });
  setStatus("Ready to sign in.");
}

loadSheetButton.addEventListener("click", () => {
  loadSheetButton.disabled = true;
  setStatus("Requesting Google Sheet permission...");
  try { requestSheetAccess(); }
  catch (error) { loadSheetButton.disabled = false; setStatus(error.message, "error"); }
});

window.addEventListener("load", () => setTimeout(initialiseGoogleLogin, 500));
