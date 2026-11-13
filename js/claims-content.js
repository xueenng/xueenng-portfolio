/* Refresh exact former claim defaults in memory; preserve custom edits and storage. */
(function () {
  'use strict';
  var legacy = [
  {
    "id": "vr-escape-room",
    "path": [
      "caseStudy",
      "sections",
      2,
      "text"
    ],
    "old": "I compared existing escape-room approaches using criteria such as visual clues, narrative, educational value and interaction. For my design, I connected diary collection, quizzes, message sequencing and a floor-plan puzzle to the castle story. I separated chapter progression from free exploration, and included visual, audio and haptic feedback to make actions and puzzle results understandable."
  },
  {
    "id": "vr-escape-room",
    "path": [
      "caseStudy",
      "sections",
      3,
      "text"
    ],
    "old": "My FYP presentation records expected and actual results for 25 system tests, all marked PASS. These cover menus, progress locks, scene changes, teleportation, grabbing, puzzle logic, feedback, turning options and progress reset. In a Google Forms questionnaire with 10 participants, 90% gave the highest rating for increased interest and understanding of Kellie's Castle and heritage tourism."
  },
  {
    "id": "vr-escape-room",
    "path": [
      "caseStudy",
      "links"
    ],
    "old": [
      {
        "label": "Original menu and level flow",
        "url": "assets/fyp/08-level-select.jpg"
      },
      {
        "label": "Original puzzle screenshot",
        "url": "assets/fyp/12-l2-sequence.jpg"
      },
      {
        "label": "Original gameplay and poster",
        "url": "kellie.html"
      }
    ]
  },
  {
    "id": "do-pipeline",
    "path": [
      "caseStudy",
      "sections",
      1,
      "text"
    ],
    "old": "The workflow needed to connect each scan to its ERP record, apply the relevant delivery and receiving-evidence rules, distinguish duplicate copies from revisions, and leave a clear reason when a document needed attention."
  },
  {
    "id": "do-pipeline",
    "path": [
      "caseStudy",
      "sections",
      2,
      "text"
    ],
    "old": "I designed most of the architecture and business logic, using AI tools throughout development. I combined AI extraction with ERP cross-checks and explicit business rules. The extracted text was one input to the filing decision, alongside delivery terms, handwritten overrides and duplicate checks. I included a reason with each outcome and a run report so the team could inspect exceptions and understand what happened."
  },
  {
    "id": "do-pipeline",
    "path": [
      "caseStudy",
      "sections",
      3,
      "text"
    ],
    "old": "The portfolio's Document Mill demonstrates these decisions using synthetic delivery orders. Its sample cases and scripted expectations cover normal filing, missing receiving evidence, own-transport terms, handwritten overrides, duplicate copies and revised copies. This demonstrates the rule logic; it is not a production accuracy measurement."
  },
  {
    "id": "vr-escape-room",
    "path": [
      "outcome"
    ],
    "old": "90-200 FPS against the 72 FPS VR comfort standard, 25 of 25 system test cases passed, and 90% of user-acceptance participants gave the highest rating for increased interest and understanding of Kellie's Castle."
  },
  {
    "id": "vr-escape-room",
    "path": [
      "caseStudy",
      "sections",
      3,
      "text"
    ],
    "old": "My FYP presentation records expected and actual results for 25 system tests, all marked PASS. These cover menus, progress locks, scene changes, teleportation, grabbing, puzzle logic, feedback, turning options and progress reset. I also evaluated the application through user-acceptance testing."
  },
  {
    "id": "do-pipeline",
    "path": [
      "impact"
    ],
    "old": "Document filing became a zero-touch process; humans only see the exceptions."
  },
  {
    "id": "do-pipeline",
    "path": [
      "overview",
      "outcome"
    ],
    "old": "Document filing became a zero-touch process; humans only see the exceptions."
  },
  {
    "id": "do-pipeline",
    "path": [
      "overview",
      "contribution"
    ],
    "old": "Built the AI extraction, ERP cross-checks, business rules, automated filing and run reporting."
  },
  {
    "id": "do-pipeline",
    "path": [
      "caseStudy",
      "sections",
      2,
      "text"
    ],
    "old": "I combined AI extraction with ERP cross-checks and explicit business rules. The extracted text was one input to the filing decision, alongside delivery terms, handwritten overrides and duplicate checks. I included a reason with each outcome and a run report so the team could inspect exceptions and understand what happened."
  },
  {
    "id": "forex-sync",
    "path": [
      "impact"
    ],
    "old": "A recurring month-end task disappeared from everyone's checklist."
  },
  {
    "id": "notify-hub",
    "path": [
      "impact"
    ],
    "old": "Alert fatigue down, trust in alerts up - when something emails you, it matters."
  },
  {
    "id": "ssrs-monitor",
    "path": [
      "subtitle"
    ],
    "old": "Finds out the reporting server is down before the users do"
  },
  {
    "id": "ssrs-monitor",
    "path": [
      "outcome"
    ],
    "old": "Outages are announced by the robot, with timestamps, before the first human notices."
  },
  {
    "id": "ssrs-monitor",
    "path": [
      "impact"
    ],
    "old": "Faster recovery and no more silent report-delivery gaps."
  },
  {
    "id": "ops-portal",
    "path": [
      "impact"
    ],
    "old": "Managers self-serve their own answers instead of asking for exports."
  },
  {
    "id": "work-record",
    "path": [
      "impact"
    ],
    "old": "Review prep went from a weekend to a button."
  },
  {
    "id": "vr-fire-extinguisher",
    "path": [
      "outcome"
    ],
    "old": "Repeatable fire-safety practice with zero real-world risk - reset the scene and drill again."
  }
];
  function at(object, keys) { return keys.reduce(function (value, key) { return value == null ? undefined : value[key]; }, object); }
  function upgrade(content, base) {
    var result = JSON.parse(JSON.stringify(content));
    legacy.forEach(function (entry) {
      var saved = (result.projects || []).find(function (p) { return p.id === entry.id; });
      var source = (base.projects || []).find(function (p) { return p.id === entry.id; });
      if (!saved || !source) return;
      var value = at(saved, entry.path);
      var matches = Array.isArray(entry.old) ? JSON.stringify(value) === JSON.stringify(entry.old) : value === entry.old;
      if (!matches) return;
      var replacement = at(source, entry.path);
      var parent = at(saved, entry.path.slice(0, -1));
      if (parent && replacement !== undefined) parent[entry.path[entry.path.length - 1]] = Array.isArray(replacement) ? JSON.parse(JSON.stringify(replacement)) : replacement;
    });
    return result;
  }
  window.PORTFOLIO_CLAIMS_CONTENT = { upgrade: upgrade };
})();
