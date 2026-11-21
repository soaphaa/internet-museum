// My Internet Museum - home page
// page 1: frames, title, ticket button
// page 2: log in / sign up / continue as guest
// page 3: a ticket with your name on it. tear it and you go into your museum

// the museum page (rooms, uploading). change this if you named it something else
const MUSEUM_PAGE = "museum.html";
const TEAR_AMOUNT = 0.85; // how much of the line you have to drag over (0.85 = 85%)

// your drawn ticket. if this file exists it replaces the drawn shapes on the ticket.
// should be 46 x 17 in shape (ex. 2300 x 850 px), png if you want see-through notches
const TICKET_ART = "assets/ticket.png";

// same project info as the top of script.js
const SUPABASE_URL = "https://aalegekaruggkqddtbrq.supabase.co";
const SUPABASE_KEY = "sb_publishable_xPPG4vDzlzCB4Ch9VAC82w_xedoBjrh";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// if you're already logged in from before, grab your username + museum name now
// so the ticket button can skip the login screen
let myProfile = null;

async function loadMyProfile() {
  const { data } = await db.auth.getSession();
  if (!data.session) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("username, museum_name")
    .eq("id", data.session.user.id)
    .maybeSingle();

  return profile;
}

loadMyProfile().then((profile) => {
  myProfile = profile;
});

function get(id) {
  return document.getElementById(id);
}


/* ===== pixel art ===== */

// the canva pixel font (dot mincho) isn't free to use online,
// so "MY INTERNET" is drawn by hand. each letter is a grid:
//   "#" = filled pixel, "." = empty
// all letters are 13 pixels tall so they line up
const LETTERS = {
  M: [
    "###........###",
    ".##........##.",
    ".###......###.",
    ".#.##....#.##.",
    ".#.##....#.##.",
    ".#..##..#..##.",
    ".#..##..#..##.",
    ".#...###...##.",
    ".#...###...##.",
    ".#....#....##.",
    ".#....#....##.",
    ".#.........##.",
    "###.......####"
  ],
  Y: [
    "####....###",
    ".##......#.",
    ".##......#.",
    "..##....#..",
    "..##....#..",
    "...##..#...",
    "...##..#...",
    "....###....",
    "....##.....",
    "....##.....",
    "....##.....",
    "....##.....",
    "..######..."
  ],
  I: [
    "######",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "..##..",
    "######"
  ],
  N: [
    "###......###",
    ".##.......#.",
    ".###......#.",
    ".#.##.....#.",
    ".#..##....#.",
    ".#...##...#.",
    ".#....##..#.",
    ".#.....##.#.",
    ".#......###.",
    ".#.......##.",
    ".#........#.",
    ".#........#.",
    "###.......#."
  ],
  T: [
    "##########",
    "#...##...#",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "..######.."
  ],
  E: [
    "#########",
    ".##....##",
    ".##.....#",
    ".##......",
    ".##..#...",
    ".######..",
    ".##..#...",
    ".##......",
    ".##......",
    ".##.....#",
    ".##....##",
    ".##....##",
    "#########"
  ],
  R: [
    "########...",
    ".##....##..",
    ".##.....##.",
    ".##.....##.",
    ".##.....##.",
    ".##....##..",
    ".######....",
    ".##..##....",
    ".##...##...",
    ".##...##...",
    ".##....##..",
    ".##....##..",
    "####....###"
  ],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", ".....",
        ".....", ".....", ".....", ".....", ".....", "....."]
};

// classic pixel mouse arrow. "#" = outline, "o" = white inside
const CURSOR = [
  "#...........",
  "##..........",
  "#o#.........",
  "#oo#........",
  "#ooo#.......",
  "#oooo#......",
  "#ooooo#.....",
  "#oooooo#....",
  "#ooooooo#...",
  "#oooooooo#..",
  "#ooooo#####.",
  "#oo#oo#.....",
  "#o#.#oo#....",
  "##..#oo#....",
  ".....#oo#...",
  ".....#oo#...",
  "......##...."
];

// pixel eye for the show/hide password button: open = hidden, closed = showing
const EYE_OPEN = [
  "...#####...",
  ".##.....##.",
  "#...###...#",
  "#...###...#",
  "#...###...#",
  ".##.....##.",
  "...#####..."
];

const EYE_SHUT = [
  "...........",
  "...........",
  "#.........#",
  ".##.....##.",
  "...#####...",
  "..#..#..#..",
  "..........."
];

const SVG_NS = "http://www.w3.org/2000/svg"; // svg elements need this to show up

// draws one grid of pixels into an svg (or a <g> inside one), starting at offsetX
function drawPixels(parent, rows, offsetX) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;

      const px = document.createElementNS(SVG_NS, "rect");
      px.setAttribute("x", offsetX + x);
      px.setAttribute("y", y);
      px.setAttribute("width", 1);
      px.setAttribute("height", 1);
      if (row[x] === "o") px.setAttribute("class", "px-light");
      parent.appendChild(px);
    }
  });
}

// writes a word letter by letter. each letter gets its own delay
// so they pop in one at a time (the animation is in home.css)
function drawWord(svg, text) {
  let x = 0;

  [...text].forEach((char, i) => {
    const rows = LETTERS[char];
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "letter");
    group.style.animationDelay = (0.2 + i * 0.045) + "s";

    drawPixels(group, rows, x);
    svg.appendChild(group);

    x += rows[0].length + 2;
  });

  svg.setAttribute("viewBox", "0 0 " + (x - 2) + " 13");
}

function drawCursor(svg) {
  drawPixels(svg, CURSOR, 0);
  svg.setAttribute("viewBox", "0 0 12 17");
}

// clears an svg and draws a new pixel icon in it (used for the eye)
function drawIcon(svg, rows) {
  svg.innerHTML = "";
  drawPixels(svg, rows, 0);
  svg.setAttribute("viewBox", "0 0 " + rows[0].length + " " + rows.length);
}

drawWord(get("wordmark"), "MY INTERNET");
drawCursor(get("perf-cursor"));
drawIcon(get("eye-icon"), EYE_OPEN);


/* ===== switching pages ===== */

// fade one page out, swap, fade the next one in.
// onShow runs right after the new page is unhidden (for stuff that needs to measure itself)
function swapPage(fromId, toId, onShow) {
  get(fromId).classList.add("fading");

  setTimeout(() => {
    get(fromId).hidden = true;
    get(toId).hidden = false;
    if (onShow) onShow();

    // wait one frame so the fade in actually animates instead of just appearing
    requestAnimationFrame(() => {
      get(toId).classList.add("shown");
    });
  }, 700); // same as the fade time in home.css
}

// already logged in -> straight to your ticket. otherwise -> log in / sign up
get("ticket-btn").onclick = () => {
  if (myProfile) {
    goToTicket("home", myProfile.username, myProfile.museum_name, false);
  } else {
    swapPage("home", "account-page");
  }
};


/* ===== log in / sign up / guest ===== */

const form = get("account-form");
const passwordBox = get("acc-password");
let loginMode = false;

// swaps the form between "create account" and "log in"
get("switch-btn").onclick = () => {
  loginMode = !loginMode;
  form.classList.toggle("login", loginMode);

  get("account-title").textContent = loginMode ? "Welcome Back" : "Create Your Account";
  get("account-subtitle").textContent = loginMode ? "Log in to open your museum." : "Make an account to open your museum.";
  get("switch-text").textContent = loginMode ? "New here?" : "Already have an account?";
  get("switch-btn").textContent = loginMode ? "Create an account" : "Log in";

  // hidden boxes can't be required or the form won't submit
  get("acc-username").required = !loginMode;
  passwordBox.autocomplete = loginMode ? "current-password" : "new-password";

  get("account-error").textContent = "";
  updateContinue();
};

// shows or hides the password when you click the eye
get("eye-btn").onclick = () => {
  const showing = passwordBox.type === "text";
  passwordBox.type = showing ? "password" : "text";
  drawIcon(get("eye-icon"), showing ? EYE_OPEN : EYE_SHUT);
  get("eye-btn").setAttribute("aria-label", showing ? "Show password" : "Hide password");
};

// checks the password against each rule, returns true/false for each one
function checkPassword(pw) {
  const result = {
    length: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw) // anything that isn't a letter or number
  };

  // count how many of the 4 types are in there
  let types = 0;
  if (result.lower) types++;
  if (result.upper) types++;
  if (result.number) types++;
  if (result.special) types++;
  result.mix = types >= 3;

  return result;
}

// ticks off the rules + turns continue on/off.
// logging in doesn't check the rules (older accounts might not follow them)
function updateContinue() {
  const result = checkPassword(passwordBox.value);

  for (const li of document.querySelectorAll("[data-rule]")) {
    li.classList.toggle("ok", result[li.dataset.rule]);
  }

  const good = loginMode ? passwordBox.value.length > 0 : result.length && result.mix;
  get("continue-btn").disabled = !good;
}

passwordBox.addEventListener("input", updateContinue);

form.onsubmit = async (e) => {
  e.preventDefault();

  get("account-error").textContent = "";
  get("continue-btn").disabled = true;
  get("continue-btn").textContent = loginMode ? "Logging in..." : "Creating...";

  const message = loginMode ? await logIn() : await signUp();

  // only gets here if something went wrong (success moves on to the ticket)
  if (message) {
    get("account-error").textContent = message;
    get("continue-btn").textContent = "Continue";
    updateContinue();
  }
};

async function logIn() {
  const email = get("acc-email").value.trim();

  const { error } = await db.auth.signInWithPassword({ email, password: passwordBox.value });
  if (error) return error.message;

  const profile = await loadMyProfile();
  if (!profile) return "Couldn't find your museum.";

  goToTicket("account-page", profile.username, profile.museum_name, false);
}

async function signUp() {
  const email = get("acc-email").value.trim();
  const username = get("acc-username").value.trim().toLowerCase();

  // no museum name typed -> "ming's museum"
  const museumName = get("acc-museum").value.trim() || username + "'s museum";

  // same username rule as setup.sql and script.js
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return "Username must be 3-20 letters, numbers or _.";
  }

  // check the username first, otherwise supabase just gives a vague "database error"
  const { data: taken } = await db
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken) return "That username is taken.";

  // the trigger in supabase copies username + museum_name into the profiles table
  const { data, error } = await db.auth.signUp({
    email,
    password: passwordBox.value,
    options: { data: { username, museum_name: museumName } }
  });

  if (error) return error.message;

  // no session means "Confirm email" is turned on in supabase
  if (!data.session) return "Check your email to confirm, then log in.";

  goToTicket("account-page", username, museumName, false);
}

// guests skip all of this. their art only lives in this tab (see script.js)
get("guest-btn").onclick = () => {
  goToTicket("account-page", "guest", "Untitled", true);
};


/* ===== ticket ===== */

let ticketGoesTo = MUSEUM_PAGE; // where tearing the ticket takes you

// puts the name + museum on the ticket and shows it
function goToTicket(fromId, username, museumName, isGuest) {
  get("t-username").textContent = username;
  get("t-museum").textContent = museumName || username + "'s museum";

  // museum.html?guest tells the museum page to use guest mode
  ticketGoesTo = isGuest ? MUSEUM_PAGE + "?guest" : MUSEUM_PAGE;

  // the text can only be measured once the page is showing
  swapPage(fromId, "ticket-page", fitTicketText);
}

// long usernames or museum names get shrunk until they fit.
// the text is sideways, so "too long" means it wrapped into extra columns and got too wide
function fitText(el, startSize) {
  const box = el.parentElement;
  let size = startSize;
  el.style.fontSize = size + "em";

  while (box.scrollWidth > box.clientWidth && size > 0.8) {
    size -= 0.1;
    el.style.fontSize = size + "em";
  }
}

function fitTicketText() {
  fitText(get("t-username"), 1.6);
  fitText(get("t-museum"), 2.4);
}

// stamps the ticket with the exact date + time the page was opened
const now = new Date();
const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
get("t-date").textContent = month + " " + now.getDate() + ", " + now.getFullYear();
get("t-time").textContent = now.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });

// barcode: each number is how thick a bar is, bars alternate with gaps.
// fixed pattern so it looks the same every time
const BARCODE = "21131241312114213122131413211231142131";

function drawBarcode() {
  const box = get("barcode");

  [...BARCODE].forEach((num, i) => {
    const bar = document.createElement("span");
    bar.style.height = (num * 0.16) + "em";
    if (i % 2 === 1) bar.className = "gap"; // every other one is empty space
    box.appendChild(bar);
  });
}

drawBarcode();

// try loading the drawn ticket. if it loads, swap the drawn shapes for it.
// if the file isn't there yet, nothing happens and the drawn version stays
const art = new Image();
art.onload = () => {
  get("ticket").style.setProperty("--ticket-art", "url(" + TICKET_ART + ")");
  get("ticket").classList.add("has-art");
};
art.src = TICKET_ART;


/* ===== tearing the ticket ===== */

const ticket = get("ticket");
const perf = get("perf");

let dragging = false;
let torn = false;
let topY = null;    // highest point dragged over on the line
let bottomY = null; // lowest point dragged over

ticket.addEventListener("pointerdown", (e) => {
  if (torn) return;
  dragging = true;
  ticket.setPointerCapture(e.pointerId); // keep tracking even if the mouse leaves the ticket
  trackTear(e);
});

ticket.addEventListener("pointermove", (e) => {
  if (dragging) trackTear(e);
});

ticket.addEventListener("pointerup", () => {
  dragging = false;
});

ticket.addEventListener("pointercancel", () => {
  dragging = false;
});

// keyboard users can press enter/space on the dotted line instead
perf.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    tearTicket();
  }
});

// keeps track of how much of the dotted line has been dragged over.
// it doesn't matter which direction, it just remembers the highest + lowest point
function trackTear(e) {
  if (torn) return;

  const box = perf.getBoundingClientRect();
  const lineX = box.left + box.width / 2;

  // ignore it if the mouse is too far from the line
  if (Math.abs(e.clientX - lineX) > box.width) return;

  // y position on the line, kept between the top and bottom of it
  const y = Math.min(Math.max(e.clientY - box.top, 0), box.height);

  if (topY === null) {
    topY = y;
    bottomY = y;
  }
  topY = Math.min(topY, y);
  bottomY = Math.max(bottomY, y);

  // gold line shows how far you've gotten (drawn by .t-perf::after in home.css)
  perf.style.setProperty("--fill-top", topY + "px");
  perf.style.setProperty("--fill-height", (bottomY - topY) + "px");

  ticket.classList.add("started"); // hides the hint + demo cursor

  if ((bottomY - topY) / box.height >= TEAR_AMOUNT) {
    tearTicket();
  }
}

function tearTicket() {
  if (torn) return;
  torn = true;
  dragging = false;

  perf.style.setProperty("--fill-top", "0px");
  perf.style.setProperty("--fill-height", "100%");
  ticket.classList.add("started", "torn"); // stub drifts away (home.css)

  // let the stub finish, fade out, then into the museum
  setTimeout(() => {
    get("ticket-page").classList.add("fading");
  }, 1500);

  setTimeout(() => {
    location.href = ticketGoesTo;
  }, 2200);
}