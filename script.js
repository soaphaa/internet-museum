// My Internet Museum - museum page (museum.html)
// loads someone's museum, adding/archiving art, and guest mode.
// logging in + signing up happen on the home page now (home.js).
// accounts save to Supabase, guests save to sessionStorage (just this tab)

// supabase project info (Project Settings > API Keys)
// the publishable key is fine to be public, the RLS rules in setup.sql are what keep things safe
const SUPABASE_URL = "https://aalegekaruggkqddtbrq.supabase.co";
const SUPABASE_KEY = "sb_publishable_xPPG4vDzlzCB4Ch9VAC82w_xedoBjrh";

// only connect if the url was actually filled in
let db = null;
if (!SUPABASE_URL.startsWith("PASTE")) {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// the room only fits 6 frames right now (3 per wall)
// TODO: bump this once there's more than one room
const MAX_PIECES = 6;
const PER_WALL = 3;

// art on the walls gets pixelated. this is how many pixels wide each one is
// (smaller = chunkier). clicking a piece still shows the full clear image
const PIXELS_ACROSS = 16;

// who's logged in vs whose museum we're looking at
// (not always the same person, ex. visiting a friend's museum)
let user = null;
let owner = null;
let isOwner = false;
let isGuest = false; // true when the url has ?guest

// art
let pieces = [];    // on the walls
let archived = [];  // hidden in the archive
let current = null; // whichever piece is open in the popup right now

// shortcut so i don't have to type document.getElementById every time
function get(id) {
  return document.getElementById(id);
}

// images are saved as a path like "userid/1732100000-cat.png"
// this turns that into a full link the <img> tag can load.
// guest images are already a full "data:" link so they're used as is
function imageUrl(path) {
  if (path.startsWith("data:")) return path;
  return db.storage.from("art").getPublicUrl(path).data.publicUrl;
}

start();


/* ===== startup ===== */

// decides what to show when the page loads:
//   ?guest              -> guest museum (saved in this tab only)
//   ?u=name             -> that person's museum
//   logged in, no ?u    -> send them to their own museum
//   none of those       -> back to the home page to log in
async function start() {
  const params = new URLSearchParams(location.search);

  if (params.has("guest")) {
    loadGuestMuseum();
    return;
  }

  if (!db) {
    console.error("Add your Supabase URL and key at the top of script.js first.");
    return;
  }

  const { data } = await db.auth.getSession();
  user = data.session ? data.session.user : null;

  const username = params.get("u");

  if (username) {
    loadMuseum(username);
  } else if (user) {
    goToOwnMuseum();
  } else {
    location.href = "./"; // home page
  }
}

async function goToOwnMuseum() {
  const { data, error } = await db
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (error) console.error("couldn't load profile:", error);

  if (data) {
    location.search = "?u=" + data.username; // changing this reloads the page
  } else {
    location.href = "./";
  }
}


/* ===== loading a museum ===== */

async function loadMuseum(username) {
  const { data: profile, error } = await db
    .from("profiles")
    .select("id, username, museum_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) console.error("couldn't load museum:", error);

  get("topbar").hidden = false;

  // typo in the link, or the account got deleted
  if (!profile) {
    get("museum-title").textContent = "Museum not found";
    get("visitor-tools").hidden = false;
    renderWalls();
    return;
  }

  owner = profile;
  isOwner = user !== null && user.id === owner.id;

  // older accounts don't have a museum name, so fall back to "ming's museum"
  const title = owner.museum_name || owner.username + "'s museum";
  get("museum-title").textContent = title;
  document.title = title;

  // owner gets the edit buttons, visitors get a link to make their own
  // (or back to their own museum if they're logged in)
  get("owner-tools").hidden = !isOwner;
  get("visitor-tools").hidden = isOwner;
  get("home-link").textContent = user ? "Your museum" : "Make your own";
  get("home-link").href = user ? location.pathname : "./";

  await loadPieces();
}

// gets all the owner's art and splits it into wall vs archive.
// visitors never get the archived ones back (RLS in setup.sql blocks it)
async function loadPieces() {
  let data;

  if (isGuest) {
    data = getGuestPieces(); // already oldest first
  } else {
    const result = await db
      .from("exhibits")
      .select("*")
      .eq("user_id", owner.id)
      .order("created_at"); // oldest first, so new art fills the next empty spot

    if (result.error) {
      console.error("couldn't load pieces:", result.error);
      return;
    }
    data = result.data;
  }

  pieces = data.filter((p) => !p.archived);
  archived = data.filter((p) => p.archived);

  renderWalls();
  renderArchive();
  get("add-btn").disabled = pieces.length >= MAX_PIECES;
}


/* ===== drawing the walls ===== */

// rebuilds both walls from scratch whenever something changes.
// spots 0-2 go on the left wall, 3-5 on the right
function renderWalls() {
  const left = get("left-wall");
  const right = get("right-wall");
  left.innerHTML = "";
  right.innerHTML = "";

  for (let i = 0; i < MAX_PIECES; i++) {
    const wall = i < PER_WALL ? left : right;
    wall.appendChild(makeSlot(pieces[i])); // pieces[i] is undefined if that spot is empty
  }
}

// makes one of 3 things:
//   a framed piece, if there's art in this spot
//   a dashed "+" button, if it's empty and you're the owner
//   an invisible spacer, if it's empty and you're a visitor (keeps spacing even)
function makeSlot(piece) {
  if (piece) {
    const frame = document.createElement("button");
    frame.className = "frame";
    frame.title = piece.title; // shows the title on hover

    // tiny canvas (16 x 21) that gets stretched to fill the frame.
    // image-rendering: pixelated in style.css keeps the pixels sharp instead of blurry
    const canvas = document.createElement("canvas");
    canvas.width = PIXELS_ACROSS;
    canvas.height = Math.round(PIXELS_ACROSS * 4 / 3); // frames are 3:4
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", piece.title);

    // draw it once the image has loaded
    const img = new Image();
    img.onload = () => drawPixelated(canvas, img);
    img.src = imageUrl(piece.image_path);

    frame.appendChild(canvas);
    frame.onclick = () => openPiece(piece);
    return frame;
  }

  if (isOwner) {
    const empty = document.createElement("button");
    empty.className = "slot slot-empty";
    empty.textContent = "+";
    empty.setAttribute("aria-label", "Add art"); // screen readers would just say "plus" otherwise
    empty.onclick = openAdd;
    return empty;
  }

  const blank = document.createElement("div");
  blank.className = "slot";
  return blank;
}


// shrinks the image down onto the tiny canvas.
// crops it like object-fit: cover, so it fills the frame without stretching
function drawPixelated(canvas, img) {
  const ctx = canvas.getContext("2d");
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;

  // "high" blends the colours properly when shrinking a big image this much
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}


/* ===== viewing a piece ===== */

function openPiece(piece) {
  current = piece; // so the archive button knows which piece to move

  get("view-img").src = imageUrl(piece.image_path);
  get("view-img").alt = piece.title;
  get("view-title").textContent = piece.title;
  get("view-desc").textContent = piece.description || ""; // description is optional

  get("view-actions").hidden = !isOwner; // visitors can't archive other people's stuff
  get("view-dialog").showModal();
}

// archiving just flips archived to true, nothing actually gets deleted
get("archive-piece-btn").onclick = async () => {
  await setArchived(current, true);
  get("view-dialog").close();
};

// used for both archiving and restoring
async function setArchived(piece, archivedNow) {
  if (isGuest) {
    const list = getGuestPieces();
    list.find((p) => p.id === piece.id).archived = archivedNow;
    saveGuestPieces(list);
  } else {
    await db.from("exhibits").update({ archived: archivedNow }).eq("id", piece.id);
  }
  loadPieces();
}


/* ===== adding a piece ===== */

function openAdd() {
  get("add-form").reset(); // clear out whatever was typed last time
  get("add-error").textContent = "";
  get("add-dialog").showModal();
}

get("add-btn").onclick = openAdd;

// saves a new piece: to supabase for accounts, or to this tab for guests
get("add-form").onsubmit = async (e) => {
  e.preventDefault();

  if (pieces.length >= MAX_PIECES) {
    get("add-error").textContent = "Your room is full. Archive a piece first.";
    return;
  }

  const file = get("add-file").files[0];

  // 5 MB. the bucket rejects bigger files anyways, this just gives a clearer message
  if (file.size > 5 * 1024 * 1024) {
    get("add-error").textContent = "Image must be under 5 MB.";
    return;
  }

  get("add-submit").disabled = true;
  get("add-submit").textContent = "Saving...";

  const title = get("add-title").value.trim();
  const description = get("add-desc").value.trim() || null; // save empty as null instead of ""

  const error = isGuest
    ? await addGuestPiece(file, title, description)
    : await uploadPiece(file, title, description);

  get("add-submit").disabled = false;
  get("add-submit").textContent = "Save";

  if (error) {
    get("add-error").textContent = error;
    return;
  }

  get("add-dialog").close();
  loadPieces();
};

// account version: upload the image to storage, then save a row in the exhibits table.
// returns an error message, or nothing if it worked
async function uploadPiece(file, title, description) {
  // each user gets their own folder named after their id (setup.sql checks this).
  // Date.now() goes in front so two files called "art.png" don't overwrite each other
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_"); // spaces + symbols mess up urls
  const path = user.id + "/" + Date.now() + "-" + safeName;

  const upload = await db.storage.from("art").upload(path, file);
  if (upload.error) return upload.error.message;

  // only save the row if the image actually uploaded
  const insert = await db.from("exhibits").insert({
    user_id: user.id,
    title,
    description,
    image_path: path
  });
  if (insert.error) return insert.error.message;
}


/* ===== archive ===== */

get("archive-btn").onclick = () => {
  get("archive-error").textContent = "";
  get("archive-dialog").showModal();
};

// fills the archive popup with a thumbnail + restore/delete buttons for each piece.
// using createElement + textContent instead of innerHTML so a title can't sneak in html
function renderArchive() {
  const grid = get("archive-grid");
  grid.innerHTML = "";

  get("archive-empty").hidden = archived.length > 0;
  get("archive-btn").textContent = "Archive (" + archived.length + ")";

  for (const piece of archived) {
    const item = document.createElement("div");
    item.className = "archive-item";

    const img = document.createElement("img");
    img.src = imageUrl(piece.image_path);
    img.alt = piece.title;

    const title = document.createElement("p");
    title.textContent = piece.title;

    const actions = document.createElement("div");
    actions.className = "actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "btn btn-small";
    restoreBtn.textContent = "Restore";
    restoreBtn.onclick = () => restorePiece(piece);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-small";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deletePiece(piece);

    actions.append(restoreBtn, deleteBtn);
    item.append(img, title, actions);
    grid.appendChild(item);
  }
}

async function restorePiece(piece) {
  // can't put it back on the wall if the wall is already full
  if (pieces.length >= MAX_PIECES) {
    get("archive-error").textContent = "Your room is full. Archive a piece first.";
    return;
  }

  await setArchived(piece, false);
}

// this one is permanent: removes the image file AND the database row
async function deletePiece(piece) {
  if (!confirm("Delete \"" + piece.title + "\" for good?")) return;

  if (isGuest) {
    saveGuestPieces(getGuestPieces().filter((p) => p.id !== piece.id));
  } else {
    await db.storage.from("art").remove([piece.image_path]);
    await db.from("exhibits").delete().eq("id", piece.id);
  }
  loadPieces();
}


/* ===== top bar ===== */

get("copy-btn").onclick = async () => {
  await navigator.clipboard.writeText(location.href);

  // quick "Copied" feedback, then switch the text back
  get("copy-btn").textContent = "Copied";
  setTimeout(() => {
    get("copy-btn").textContent = "Copy link";
  }, 1500);
};

get("logout-btn").onclick = async () => {
  if (isGuest) {
    // leaving wipes the guest museum, so double check first
    if (!confirm("Leave? Your guest museum will be erased.")) return;
    sessionStorage.removeItem("guestPieces");
    sessionStorage.removeItem("guestWarned");
  } else {
    await db.auth.signOut();
  }
  location.href = "./"; // home page
};


/* ===== guest mode ===== */

// guests don't have an account, so their art goes in sessionStorage instead of supabase.
// sessionStorage belongs to this one tab: refreshing keeps it, closing the tab wipes it
function loadGuestMuseum() {
  isGuest = true;
  isOwner = true; // a guest can edit their own (temporary) museum

  get("topbar").hidden = false;
  get("museum-title").textContent = "Guest museum";
  document.title = "Guest museum";
  get("owner-tools").hidden = false;
  get("copy-btn").hidden = true; // the link wouldn't work for anyone else
  get("logout-btn").textContent = "Exit";

  loadPieces();

  // warning pops up once per tab, a moment after the walls show up
  if (!sessionStorage.getItem("guestWarned")) {
    setTimeout(() => get("guest-dialog").showModal(), 900);
  }
}

get("guest-ok-btn").onclick = () => get("guest-dialog").close();

// however the warning gets closed (button, esc, clicking outside), don't show it again
get("guest-dialog").addEventListener("close", () => {
  sessionStorage.setItem("guestWarned", "yes");
});

function getGuestPieces() {
  return JSON.parse(sessionStorage.getItem("guestPieces") || "[]");
}

function saveGuestPieces(list) {
  sessionStorage.setItem("guestPieces", JSON.stringify(list));
}

// guest version of uploading. returns an error message, or nothing if it worked
async function addGuestPiece(file, title, description) {
  const list = getGuestPieces();

  list.push({
    id: Date.now(), // good enough as a unique id for one person
    title,
    description,
    image_path: await shrinkImage(file),
    archived: false
  });

  // sessionStorage only holds about 5 MB, so this can fail if there's a lot of art
  try {
    saveGuestPieces(list);
  } catch (err) {
    return "No room left to save more as a guest. Delete a piece or make an account.";
  }
}

// guest images get saved as text, so shrink them first to fit more.
// max 1000px on the longest side, saved as a jpg
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // jpgs can't be see-through, so fill white behind pngs
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}


/* ===== closing popups ===== */

// every X button closes whatever popup it's inside
for (const btn of document.querySelectorAll("[data-close]")) {
  btn.onclick = () => btn.closest("dialog").close();
}

// clicking the blurry area outside a popup closes it too.
// e.target is the dialog for BOTH the backdrop and the dialog's own padding,
// so also check if the click was actually outside the box
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.onclick = (e) => {
    if (e.target !== dialog) return;

    const box = dialog.getBoundingClientRect();
    const outside =
      e.clientX < box.left || e.clientX > box.right ||
      e.clientY < box.top || e.clientY > box.bottom;

    if (outside) dialog.close();
  };
}