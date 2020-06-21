// Make sure that MAX auto-watches changes in this file
autowatch = 1;
// inlet 0: Input phrase
// inlet 1: Playlist start/done notifications
// inlet 2: Clear state
inlets = 3;
// outlet 0: Scale
// outlet 1: Tonica
// outlet 2: Logs for debugging
// outlet 3: Evaluation success/failure output
outlets = 4;

var settings = {
  // Defines by how much we want hits on indicator notes to have a stronger impact on scale ranking
  indicatorFactor: 1.1,
  // Defines the exponential base impacting how fast multiple repetitions of the same note impact its weight
  // when calculating the impact on scale ranking
  hitsFactor: 1.25,
};

var lastExpectedScale = undefined;
var lastFoundScale = undefined;

function clear() {
  lastExpectedScale = undefined;
  lastFoundScale = undefined;
  log("Cleared");
}

// This is the entry point function into the scale finder.
function list() {
  lastFoundScale = findScaleByNotesAndDurations(arguments);
  test();
}

var started = false;
function start(_fileIndex, fileName) {
  log("Started: " + fileName);
  started = true;
}

function done(_fileIndex, fileName) {
  if (started === true) {
    log("Expected scale file name: " + fileName);
    
    fileName = fileName.substr(fileName.lastIndexOf("\\") + 1);
    var firstPeriodIndex = fileName.indexOf(".");
    if (firstPeriodIndex !== -1) {
      lastExpectedScale = fileName.substr(0, firstPeriodIndex);

      log("Expected scale: " + lastExpectedScale);
    } else {
      log("Couldn't parse file name to find the expected scale!");
    }

    test();

    started = false;
  }
}

function test() {
  if (lastFoundScale !== undefined && lastExpectedScale !== undefined) {
    printTest(lastExpectedScale, lastFoundScale);
    log("Found scale: " + lastFoundScale);
    lastFoundScale = undefined;
    lastExpectedScale = undefined;
  }
}

// Find a scale based on the notes played, as well as the duration (in ms) each note was played.
// Input: An array of values, alternating between the note position played (0-11) and the
//        duration (in ms) for that note position.
// Output, outlet 0: If found, outputs the best matching scale for the given input. Otherwise, outputs "Unknown Scale".
// Output, outlet 1: If one or more notes were received in the input, outputs the first note received.
// Output, outlet 2: Logs
function findScaleByNotesAndDurations(notesAndDurations) {
  // Don't don't anything if no notes were received.
  if (notesAndDurations.length === 0) return;
  // Remember the first input.
  var firstDegreeNote = notesAndDurations[0];
  // Generate a histogram out of the input notes and their durations
  var histogram = generateHistogram(notesAndDurations);
  // Rank and sort all the scales against the calculated histogram
  var sortedScales = rankAllScales(histogram);

  var result = sortedScales[0].name;

  printFirstDegree(firstDegreeNote);
  printScale(result);
  return result;
}

// Generates a weighted hitogram whic, for each note, calculates a score based
// on number of repetitions and total duration in the given input.
// Input: An array with each data point alternating between the note played and its duration
// Output: An object containing an entry for each (non-zero) note; each entry holds the caclulated "score"
//         for that note. When including notes in the matching against the different scales, that is the score used
//         to affect the likelohood of the correct scale being identified.
function generateHistogram(notesAndDurations) {
  // Holds a simple histogram (note, total duration)
  var histogram = {};
  // These holds a string representation of the input (original and processed)
  // for logging purposes
  var originalInput = "";
  var processedInput = "";
  var bassNote = notesAndDurations[0];

  // Go through each note in the input, calculate the shifted note value
  // and the save the total duration for that note in the histogram variable
  for (var i = 0; i < notesAndDurations.length - 1; i = i + 2) {
    var originalNote = notesAndDurations[i];
    // After the first modulus (% 12), we might have negativate values, if the input includes
    // notes that are below the first note played (the bass note). By adding 12 and then running modulus
    // again, we are guaranteed that shiftedNote always holds a value 0-11.
    var shiftedNote = ((((originalNote - bassNote) % 12) + 12) % 12);
    // Grab the duration off the input
    var duration = notesAndDurations[i+1];
    originalInput += "(" + originalNote + ", " + Math.round(duration) + ") ";
    // We don't need to include the bass note (shiftedNote value of 0) in the histogram, since none of
    // the scales' notes include the 0-value. It is assumed to be in all of them,
    // so there's not point taking it into account.
    if (shiftedNote === 0) continue;
    processedInput += "(" + shiftedNote + ", " + Math.round(duration) + ") ";
    var entry = histogram[shiftedNote];
    // If this is the first time we encounter this (shifted) note,
    if (!entry) {
      // Create an entry in the histogram for it
      entry = {
        duration: 0,
        hits: 0,
      };
      histogram[shiftedNote] = entry;
    }

    // Increase the total duration for that note's entry,
    entry.duration += duration;
    // As well as the number of hits.
    entry.hits++;
  }

  log("Original input: (Original note, Duration)");
  log(originalInput, true);
  log("Bass note: " + bassNote);
  log("Processed input – excludes the first degree note: (Shifted note, Duration)");
  log(processedInput, true);

  var histStr = "";
  var combinedHistogram = {};
  // Run through each of the notes in the histogram,
  var histogramNotes = Object.keys(histogram).sort(function (a, b) {
    return parseInt(a) - parseInt(b);
  });
  for (var i = 0; i < histogramNotes.length; i++) {
    var note = histogramNotes[i];
    // Create a calculated score for the note, based on:
    // * The total duration of the note (histogram[note].duration)
    // * The number of repetitions we've seen of that note in the provided input.
    // We give an exponentialy increasing impact/weight to a note that's been played multiple times in a phrase.
    // And the curve of that exponent is determined by settings.hitsFactor at the top of this file.
    combinedHistogram[note] = histogram[note].duration * Math.pow(settings.hitsFactor, histogram[note].hits); //totallNoteDuration*1.2^nr
    histStr += "(" + note + ", " + histogram[note].hits + ", " + Math.round(histogram[note].duration) + ", " + Math.round(combinedHistogram[note]) + ")\n";//histStr is for logging
  }

  log("Histogram: (Shifted note, repetitions, total duration, note-weight)");
  log(histStr, true);

  log("Total notes received: " + notesAndDurations.length / 2);
  log("Number of unique notes received: " + (histogramNotes.length + 1));

  return combinedHistogram;
}

// Ranks all the scales against the provided histogram and,
// if a singular top scale leads the ranking list, returns that scale.
function rankAllScales(histogram) {
    // Calculate the rank for each scale
  for (var i = 0; i < scales.length; i++) {
    var scale = scales[i];
    scale.rank = calculateScaleRank(scale, histogram);
  }

  // Sort descending
  var sortedScales = scales.sort(function (a, b) {
    return b.rank - a.rank;
  });

  log("Scales by rank: (Scale name [scale notes], [indicator notes], Scale rank)")
  for (var i = 0; i < scales.length; i++) {
    log(scales[i].name + " " + JSON.stringify(scales[i].notes) + ", " + JSON.stringify(scales[i].indicators) + ": " + Math.round(scales[i].rank));
  }
  log("");

  return sortedScales;
}

// Calculates a score for the provided scale, according to the provided histogram.
// A score is calculated by adding up the "weights"/scores for each note that is in the weighted
// histogram, if that note is part of the scale being scored.
function calculateScaleRank(scale, histogram) {
  // Holds the resulting rank/score.
  var rank = 0;
  // For each note in the scale,
  for (var i = 0; i < scale.notes.length; i++) {
    var scaleNote = scale.notes[i];
    // Search for that note in the histogram.
    // If it isn't found in the histogram, give it an impact of 0.
    var rankIncrease = histogram[scaleNote] || 0;

    // Check if the note is an indicator note, and if so, treat its weight as more significant
    if (rankIncrease && scale.indicators.indexOf(scaleNote) !== -1) {
      rankIncrease *= settings.indicatorFactor;
    }

    // Increase the total rank we will give the scale.
    rank += rankIncrease;
  }

  return rank;
}

// Outlet wrapper functions, making it easier to change the order of the outlets if we wanted to:
function printScale(val) {
  outlet(0, val);
}

function printFirstDegree(note) {
  outlet(1, note);
}

function log(val, newline) {
  if (typeof(val) !== 'string') {
    val = JSON.stringify(val);
  }
  outlet(2, val + (newline ? "\n" : ""));
}

function printTest(expected, actual) {
  if (expected === actual) {
    outlet(3, "1");
  } else {
    outlet(3, "Failed: Expected '" + expected + "', but found '" + actual + "'");
  }
}

/// A list of all the scales we want to consider.
// Each scale holds a name, the notes of the scale (all except for the first degree note)
// and notes that are considered stronger indicators that this is the scale being played.
var scales =[
  // Major Scale Modes
  { name: "Ionian", notes: [2,4,5,7,9,11], indicators: [4,5,11] },
  { name: "Dorian", notes: [2,3,5,7,9,10], indicators: [3,9,10] },
  { name: "Phrygian", notes: [1,3,5,7,8,10], indicators: [1,3,10] },
  { name: "Lydian", notes: [2,4,6,7,9,11], indicators: [4,6,11] },
  { name: "Mixolydian", notes: [2,4,5,7,9,10], indicators: [4,5,10] },
  { name: "Aeolian", notes: [2,3,5,7,8,10], indicators: [3,8,10] },
  { name: "Locrian", notes: [1,3,5,6,8,10], indicators: [1,3,6,8] },
  // Melodic Minor Scale Modes
  { name: "Melodic Minor", notes: [2,3,5,7,9,11], indicators: [3,11] },
  { name: "Dorian b2", notes: [1,3,5,7,9,10], indicators: [1,3,9] },
  { name: "Lydian Aug", notes: [2,4,6,8,9,11], indicators: [4,6,8] },
  { name: "Mixolydian #11", notes: [2,4,6,7,9,10], indicators: [4,6,10] },
  { name: "Mixolydian b6", notes: [2,4,5,7,8,10], indicators: [4,8,10] },
  { name: "Locrian Natural 9", notes: [2,3,5,6,8,10], indicators: [2,3,6,8] },
  { name: "Altered Dominant", notes: [1,3,4,6,8,10], indicators: [1,3,4] },
  // Harmonic Minor Scale Modes
  { name: "Harmonic Minor", notes: [2,3,5,7,8,11], indicators: [3,8,11] },
  { name: "Locrian Natural 6", notes: [1,3,5,6,9,10], indicators: [1,3,9] },
  { name: "Ionian Aug", notes: [2,4,5,8,9,11], indicators: [4,8] },
  { name: "Dorian #11", notes: [2,3,6,7,9,10], indicators: [3,6,10] },
  { name: "Phrygian Major", notes: [1,4,5,7,8,10], indicators: [1,4,10] },
  { name: "Lydian #9", notes: [3,4,6,7,9,11], indicators: [3,4,6] },
  { name: "Altered Dominant bb7", notes: [1,3,4,6,8,9], indicators: [1,3,4,8,9] }
];
