const GOOGLE_CLIENT_ID = "679009305083-pq22t40sf6p2r2f20rkv14imdu128cf6.apps.googleusercontent.com";
const GOOGLE_SHEET_ID = "12d7oiNkhWP8XOA_o8hAveLrJBfgPpmUAfkjJgnr5CRo";
const GOOGLE_SHEET_TAB = "AhmadSyahmi_Assesment_Sheet";
const AUTH_SCOPE = "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly";

const statusElement = document.querySelector("#status");
const signInButton = document.querySelector("#sign-in");
const profileHeading = document.querySelector("#welcome-title");
const profileEmail = document.querySelector("#welcome-email");
const dataPanel = document.querySelector("#data-panel");
const dataBody = document.querySelector("#data-body");
const searchInput = document.querySelector("#search-records");
const clearSearchButton = document.querySelector("#clear-search");
const recordCount = document.querySelector("#record-count");
let allRows = [];
let tokenClient;

function setStatus(message, type = "") { statusElement.textContent = message; statusElement.className = `status ${type}`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character])); }
function formatCurrency(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function parseMoney(value) { return Number(String(value ?? "").replace(/[$,\s]/g, "")) || 0; }

function renderRows(rows) {
  dataBody.innerHTML = rows.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${row.age}</td><td>${escapeHtml(row.country)}</td><td>${escapeHtml(row.interest)}</td><td>${formatCurrency(row.netWorth)}</td></tr>`).join("");
  recordCount.textContent = `${rows.length} of ${allRows.length} records`;
}

function filterRows() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query ? allRows.filter(row => [row.name, row.country, row.interest, row.netWorth].join(" ").toLowerCase().includes(query)) : allRows;
  renderRows(filtered);
}

async function readSheet(accessToken) {
  const range = `${GOOGLE_SHEET_TAB}!A:F`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}`;
  let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  let payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status === 400) {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEET_ID)}/values/A:F`, { headers: { Authorization: `Bearer ${accessToken}` } });
    payload = await response.json().catch(() => ({}));
  }
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}: ${payload?.error?.message || "Check sharing and API setup."}`);
  const [, ...records] = payload.values || [];
  allRows = records.filter(row => row[0]).map(row => ({ name: row[0], photo: row[1], age: Number(row[2]) || 0, country: row[3] || "", interest: row[4] || "", netWorth: parseMoney(row[5]) }));
  renderRows(allRows);
  dataPanel.hidden = false;
  window.dispatchEvent(new CustomEvent("sheet-data-loaded", { detail: allRows }));
}

async function finishSignIn(response) {
  if (response.error) throw new Error(`${response.error}${response.error_description ? `: ${response.error_description}` : ""}`);
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${response.access_token}` } });
  if (!userResponse.ok) throw new Error("Google returned an invalid profile response.");
  const user = await userResponse.json();
  profileHeading.textContent = `Welcome back, ${user.name || "there"}`;
  profileEmail.textContent = user.email ? `Signed in as ${user.email}` : "Google sign-in successful";
  setStatus("Reading your Google Sheet...");
  await readSheet(response.access_token);
  setStatus(`Loaded ${allRows.length} records.`, "success");
  signInButton.hidden = true;
}

function signInOnce() {
  if (!window.google?.accounts?.oauth2) { setStatus("Google authorization is still loading. Refresh and try again.", "error"); return; }
  signInButton.disabled = true;
  setStatus("Opening Google sign-in...");
  tokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: AUTH_SCOPE, callback: response => finishSignIn(response).catch(error => { console.error(error); setStatus(error.message, "error"); signInButton.disabled = false; }) });
  tokenClient.requestAccessToken({ prompt: "consent" });
}

searchInput.addEventListener("input", filterRows);
clearSearchButton.addEventListener("click", () => { searchInput.value = ""; filterRows(); searchInput.focus(); });
signInButton.addEventListener("click", signInOnce);
