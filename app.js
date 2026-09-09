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
const countryFilter = document.querySelector("#country-filter");
const interestFilter = document.querySelector("#interest-filter");
const sortBy = document.querySelector("#sort-by");
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

function populateFilters() {
  const countries = [...new Set(allRows.map(row => row.country))].sort();
  const interests = [...new Set(allRows.map(row => row.interest))].sort();
  countryFilter.innerHTML = `<option value="">All countries</option>${countries.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  interestFilter.innerHTML = `<option value="">All interests</option>${interests.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
}

function filterRows() {
  const query = searchInput.value.trim().toLowerCase();
  let filtered = allRows.filter(row => {
    const matchesText = !query || [row.name, row.country, row.interest, row.netWorth].join(" ").toLowerCase().includes(query);
    const matchesCountry = !countryFilter.value || row.country === countryFilter.value;
    const matchesInterest = !interestFilter.value || row.interest === interestFilter.value;
    return matchesText && matchesCountry && matchesInterest;
  });
  if (sortBy.value) {
    const [field, direction] = sortBy.value.split("-");
    filtered = [...filtered].sort((a, b) => (a[field === "worth" ? "netWorth" : field] - b[field === "worth" ? "netWorth" : field]) * (direction === "desc" ? -1 : 1));
  }
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
  populateFilters();
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
countryFilter.addEventListener("change", filterRows);
interestFilter.addEventListener("change", filterRows);
sortBy.addEventListener("change", filterRows);
clearSearchButton.addEventListener("click", () => { searchInput.value = ""; countryFilter.value = ""; interestFilter.value = ""; sortBy.value = ""; filterRows(); searchInput.focus(); });
signInButton.addEventListener("click", signInOnce);
window.addEventListener("person-selected", event => {
  searchInput.value = event.detail.name;
  countryFilter.value = "";
  interestFilter.value = "";
  sortBy.value = "";
  filterRows();
  dataPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  setStatus(`Selected ${event.detail.name}.`, "success");
});
