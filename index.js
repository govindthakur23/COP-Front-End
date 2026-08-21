const moment = require("moment");
const { execSync } = require("child_process");
const fs = require("fs");

const FILE_PATH = "data.txt";
const STATE_FILE = ".commit-test-state.json";

// ================= CONFIG =================

const START_DATE = moment("2025-01-01");
const END_DATE = moment("2026-03-31");

// Total historical test commits allowed.
// Change this to 20, 30, 40, etc.
const MAX_COMMITS = 30;

// Minimum gap between generated commit days.
const MIN_GAP_DAYS = 3;

// ==========================================

// Load previous state
let state = {
  generatedDates: [],
  totalCommits: 0,
};

if (fs.existsSync(STATE_FILE)) {
  state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

console.log(`Existing test commits: ${state.totalCommits}`);
console.log(`Maximum allowed: ${MAX_COMMITS}`);

if (state.totalCommits >= MAX_COMMITS) {
  console.log("Limit reached. Nothing to generate.");
  process.exit(0);
}

// Convert previously used dates to a Set
const usedDates = new Set(state.generatedDates);

// Create all eligible weekdays
const availableDates = [];

let current = START_DATE.clone();

while (current.isSameOrBefore(END_DATE)) {
  const day = current.day();

  // Monday-Friday only
  if (day !== 0 && day !== 6) {
    const dateKey = current.format("YYYY-MM-DD");

    if (!usedDates.has(dateKey)) {
      availableDates.push(current.clone());
    }
  }

  current.add(1, "day");
}

// Shuffle dates
availableDates.sort(() => Math.random() - 0.5);

// Select dates while maintaining gaps
const selectedDates = [];

for (const date of availableDates) {
  if (selectedDates.length === 0) {
    selectedDates.push(date);
    continue;
  }

  const lastDate = selectedDates[selectedDates.length - 1];

  if (Math.abs(date.diff(lastDate, "days")) >= MIN_GAP_DAYS) {
    selectedDates.push(date);
  }

  if (
    selectedDates.length >=
    Math.min(5, MAX_COMMITS - state.totalCommits)
  ) {
    break;
  }
}

// ================= CREATE COMMITS =================

for (const date of selectedDates) {
  const hour = Math.floor(Math.random() * 9) + 9;
  const minute = Math.floor(Math.random() * 60);

  const commitTime = date.clone()
    .hour(hour)
    .minute(minute)
    .second(0);

  const formattedDate = commitTime.format();

  const content =
    `Test update\n` +
    `Generated: ${formattedDate}\n` +
    `Random: ${Math.random()}`;

  fs.writeFileSync(FILE_PATH, content);

  try {
    execSync("git add data.txt");

    execSync(
      `git commit --date="${formattedDate}" -m "test: update data"`
    );

    const dateKey = date.format("YYYY-MM-DD");

    state.generatedDates.push(dateKey);
    state.totalCommits++;

    console.log(
      `Created ${state.totalCommits}/${MAX_COMMITS}: ${formattedDate}`
    );
  } catch (error) {
    console.log(`Skipped ${formattedDate}`);
  }

  if (state.totalCommits >= MAX_COMMITS) {
    break;
  }
}

// Save state
fs.writeFileSync(
  STATE_FILE,
  JSON.stringify(state, null, 2)
);

console.log("\nDone.");
console.log(`Total generated: ${state.totalCommits}/${MAX_COMMITS}`);