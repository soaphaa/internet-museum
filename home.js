// My Internet Museum - home page + ticket
// page 1: frames, title, ticket button
// page 2: a ticket you tear along the dotted line, then it goes into the museum

const NEXT_PAGE = "index.html"; // where you end up after tearing the ticket
const TEAR_AMOUNT = 0.85;       // how much of the line you have to drag over (0.85 = 85%)

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
    group.style.animationDelay = (0.4 + i * 0.09) + "s";

    drawPixels(group, rows, x);
    svg.appendChild(group);

    x += rows[0].length + 2; // 2 pixel gap between letters
  });

  svg.setAttribute("viewBox", "0 0 " + (x - 2) + " 13");
}

function drawCursor(svg) {
  drawPixels(svg, CURSOR, 0);
  svg.setAttribute("viewBox", "0 0 12 17");
}

drawWord(get("wordmark"), "MY INTERNET");
drawCursor(get("perf-cursor"));


/* ===== going from home to the ticket ===== */

// slow fade out, swap pages, slow fade in
get("ticket-btn").onclick = () => {
  get("home").classList.add("fading");

  setTimeout(() => {
    get("home").hidden = true;
    get("ticket-page").hidden = false;

    // wait one frame so the fade in actually animates instead of just appearing
    requestAnimationFrame(() => {
      get("ticket-page").classList.add("shown");
    });
  }, 1400); // same as the fade time in home.css
};


/* ===== ticket details ===== */

// today's date on the stub, ex. "NOV 20 –"
const today = new Date();
const month = today.toLocaleString("en-US", { month: "short" }).toUpperCase();
get("t-date").innerHTML = month + " " + today.getDate() + " &ndash;<br>FOREVER";

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


/* ===== tearing the ticket ===== */

const ticket = get("ticket");
const perf = get("perf");
const fill = get("perf-fill");

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

  // gold line shows how far you've gotten
  fill.style.top = topY + "px";
  fill.style.height = (bottomY - topY) + "px";

  ticket.classList.add("started"); // hides the hint + demo cursor

  if ((bottomY - topY) / box.height >= TEAR_AMOUNT) {
    tearTicket();
  }
}

function tearTicket() {
  if (torn) return;
  torn = true;
  dragging = false;

  fill.style.top = "0px";
  fill.style.height = "100%";
  ticket.classList.add("started", "torn"); // stub drifts away slowly (home.css)

  // let the stub finish fading, then fade the whole page out and go to the museum
  setTimeout(() => {
    get("ticket-page").classList.add("fading");
  }, 3200);

  setTimeout(() => {
    location.href = NEXT_PAGE;
  }, 4600);
}