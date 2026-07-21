/* ============================================================
   content.js — THE ONLY FILE THAT HOLDS PERSONAL DATA (schema 2).
   Everything on the site renders from this object.
   You normally never edit this file by hand:
   open the site, press Ctrl+E (edit mode), change things,
   then "Export content.js" and replace this file — or use
   "Publish to GitHub" to update the live site directly.
   ============================================================ */
window.PORTFOLIO_CONTENT = {
  "schema": 2,
  "meta": {
    "accent": "#E8A200",
    "defaultTheme": "light",
    "siteTitle": "Ng Xue En — XE Studio · Systems by day, worlds by night",
    "adminHash": ""
  },
  "identity": {
    "name": "Ng Xue En",
    "monogram": "XE",
    "title": "Business System Analyst & Creative Technologist",
    "tagline": "I build systems that run without me - and worlds you can step into.",
    "summary": "Business System Analyst at Golden Pet Industries with a Computer Science background (UTAR). By day I design end-to-end automation: AI document pipelines, ERP data syncs, monitoring and notification systems - self-hosted, self-running. Off the clock I build playable worlds, including a VR escape room set in a real Malaysian heritage castle. Two sides, one habit: take something manual and messy, and make it run beautifully on its own.",
    "location": "Ipoh, Perak, Malaysia",
    "email": "xueenng5678@gmail.com",
    "avatar": "",
    "photo": "assets/me.jpg",
    "photoCaption": "hello, it's me",
    "links": [
      { "label": "GitHub", "url": "https://github.com/xueenng" },
      { "label": "LinkedIn", "url": "https://my.linkedin.com/in/ng-xue-en-5516962b1" }
    ]
  },
  "hero": {
    "kicker": "XE Studio - portfolio of Ng Xue En",
    "headline": "Systems by day.\nWorlds by night.",
    "subline": "Automation engineer and game builder. Every project below is alive - run the pipelines, step through the escape room, watch the systems think.",
    "terminal": [
      "$ whoami",
      "xue-en : business system analyst / creative technologist",
      "$ ./run_pipeline --all",
      "[OK] documents read, verified, renamed and filed",
      "[OK] exchange rates synced into the ERP",
      "[OK] alerts routed to the right people",
      "$ ./load_world kellies-castle",
      "[OK] world loaded. good luck getting out.",
      "$ status",
      "all systems green. built by hand, runs on its own."
    ],
    "stats": [
      { "value": "18", "label": "projects you can run right here" },
      { "value": "24/7", "label": "self-hosted automation platform" },
      { "value": "1000s", "label": "of documents processed by AI" },
      { "value": "1", "label": "VR world built from scratch" }
    ]
  },
  "now": [
    "Rolling out the operations portal at work",
    "Polishing the web build of the VR escape room",
    "Learning: scroll-driven animations and 3D on the web"
  ],
  "sections": {
    "selected": {
      "heading": "Selected work",
      "sub": "The two projects that best show both sides - run them, do not just read them."
    },
    "projects": {
      "heading": "All projects",
      "sub": "Every card runs: work systems as safe simulations with mock data, game and academic work as light playable demos - source on GitHub where public."
    },
    "skills": { "heading": "Toolbox", "sub": "What I build with, grouped by how I actually use it." },
    "journey": { "heading": "Journey", "sub": "From 10 straight As at SPM to production automation systems - where I have been and what I shipped along the way." },
    "achievements": { "heading": "Hall of Achievements", "sub": "Every honour, certificate and moment worth keeping - collected era by era, from primary school to the present." },
    "contact": { "heading": "Let's talk", "sub": "Open to conversations about automation, data, AI-assisted operations and interactive 3D." }
  },
  "projects": [
    {
      "id": "vr-escape-room",
      "title": "Echoes in Kellie's Castle",
      "subtitle": "A VR escape room inside a real Malaysian heritage site - my final year project, built solo from Blender vertices to Unity gameplay",
      "period": "Jun 2024 - Dec 2025 - final year project, UTAR",
      "year": "2025",
      "status": "DONE",
      "category": "game",
      "featured": true,
      "problem": "Heritage sites like Kellie's Castle struggle to engage young visitors - traditional tours are passive, and virtual reality is barely used in Malaysian tourism. My FYP set out to prove that VR plus gamification can turn a historical site into an experience people want to explore and learn from.",
      "action": "Modelled Kellie's Castle in Blender from historical research - facade, semi-circular tower, staircases - then built the game in Unity (C#, OpenXR, XR Interaction Toolkit): three escape-room levels of story-driven puzzles (diary-piece quizzes, a message-sequence puzzle, candle-revealed hidden clues, a timed floor-plan jigsaw and a numpad lock) plus a free VR-360 exploration mode. Full VR interaction: teleportation, grabbable objects, haptic and audio feedback, snap or continuous turning, saved progress - running on Meta Quest 2, desktop and Android.",
      "outcome": "90-200 FPS against the 72 FPS VR comfort standard, 25 of 25 system test cases passed, and 90% of user-acceptance participants gave the highest rating for increased interest and understanding of Kellie's Castle.",
      "impact": "One person, one world: from Blender vertices to a shipped, tested VR experience - and proof that heritage can be taught through play.",
      "stack": ["Unity", "C#", "Blender", "OpenXR + XR Interaction Toolkit", "Meta Quest 2", "Agile"],
      "exhibit": {
        "type": "demo",
        "demo": "kellie-fyp",
        "src": "",
        "video": "",
        "poster": "assets/fyp/05-start-menu.jpg",
        "images": [
          "assets/fyp/01-blender-castle.jpg",
          "assets/fyp/02-blender-rear.jpg",
          "assets/fyp/03-blender-tower.jpg",
          "assets/fyp/04-blender-staircase.jpg",
          "assets/fyp/05-start-menu.jpg",
          "assets/fyp/06-options.jpg",
          "assets/fyp/07-about.jpg",
          "assets/fyp/08-level-select.jpg",
          "assets/fyp/09-l1-diary.jpg",
          "assets/fyp/10-l1-quiz.jpg",
          "assets/fyp/11-l2-find.jpg",
          "assets/fyp/12-l2-sequence.jpg",
          "assets/fyp/13-l3-jigsaw.jpg",
          "assets/fyp/14-l3-blueprint.jpg",
          "assets/fyp/15-l3-numpad.jpg",
          "assets/fyp/16-vr360.jpg"
        ]
      },
      "links": [
        { "label": "Enter the Castle - full experience", "url": "kellie.html" }
      ]
    },
    {
      "id": "do-pipeline",
      "title": "Delivery Order Intelligence Pipeline",
      "subtitle": "Vision-AI reads, verifies and files every scanned delivery order",
      "period": "2026 - live in production",
      "year": "2026",
      "status": "LIVE",
      "category": "work",
      "featured": true,
      "problem": "Hundreds of scanned delivery orders arrived as anonymous scan files. Someone had to open each one, check the customer's chop and signature, look the order up in the ERP, rename the file and file it - slow, boring and error-prone.",
      "action": "Built an AI pipeline on a self-hosted automation platform: a vision LLM reads each scan (two-pass OCR with a fallback model), detects whether the customer box carries a valid chop or signature, cross-checks the order against the ERP, applies business rules (own-transport terms, handwritten overrides, duplicate full-content comparison), then renames and files the document and logs every decision.",
      "outcome": "Every scan is classified Success / Needs Review / Failed with a reason. A styled Excel run report is emailed after each run, and the team can re-trigger processing from a chat message.",
      "impact": "Document filing became a zero-touch process; humans only see the exceptions.",
      "stack": ["n8n", "Claude vision models", "SharePoint & Graph API", "JavaScript", "ERP SQL"],
      "exhibit": { "type": "demo", "demo": "do-pipeline" },
      "links": []
    },
    {
      "id": "forex-sync",
      "title": "Central Bank Exchange Rate Sync",
      "subtitle": "Monthly forex rates flow from Bank Negara Malaysia into the ERP by themselves",
      "period": "2026 - live in production",
      "year": "2026",
      "status": "LIVE",
      "category": "work",
      "featured": false,
      "problem": "Month-end accounting needed official BNM exchange rates keyed into the ERP for every active currency - a manual, deadline-critical chore that could silently go wrong.",
      "action": "Built a scheduled workflow that discovers which currencies the ERP actually uses, pulls official rates from the BNM open API, retries across a morning window when the feed is late, writes the rates into the ERP, and emails a summary - flagging partial results loudly instead of failing silently.",
      "outcome": "Rates appear in the ERP on the 1st of every month before anyone is awake. Missing currencies trigger an alert instead of a silent gap.",
      "impact": "A recurring month-end task disappeared from everyone's checklist.",
      "stack": ["n8n", "REST API", "MSSQL", "Timezone-safe scheduling"],
      "exhibit": { "type": "demo", "demo": "forex-sync" },
      "links": []
    },
    {
      "id": "notify-hub",
      "title": "Shared Notification Hub",
      "subtitle": "One routing brain decides who hears about which failure, where",
      "period": "2026 - live in production",
      "year": "2026",
      "status": "LIVE",
      "category": "work",
      "featured": false,
      "problem": "Every workflow had its own copy-pasted alert emails. Changing a recipient meant editing workflows one by one, and test noise reached real users.",
      "action": "Built a shared notification service every workflow reports into: recipients live in a SharePoint list the team edits (no code changes), each module has a testing/live stage gate so unfinished systems only email admins, alerts fan out to email with an automatic fallback sender, and critical ones also post cards into Teams.",
      "outcome": "One place to manage who gets notified. Flipping a module from testing to live is a data change, not a deployment.",
      "impact": "Alert fatigue down, trust in alerts up - when something emails you, it matters.",
      "stack": ["n8n", "SharePoint lists", "Outlook + Gmail fallback", "Microsoft Teams", "Power Automate"],
      "exhibit": { "type": "demo", "demo": "notify-hub" },
      "links": []
    },
    {
      "id": "ssrs-monitor",
      "title": "Report Server Watchdog",
      "subtitle": "Finds out the reporting server is down before the users do",
      "period": "2026 - live in production",
      "year": "2026",
      "status": "LIVE",
      "category": "work",
      "featured": false,
      "problem": "When the SSRS reporting server went down, the first alert was an annoyed colleague. By then reports had been failing for hours.",
      "action": "Built a twice-daily reachability probe: it checks the report server, and on failure enters a patient retry loop (six retries, ten minutes apart) to ride out reboots before declaring an outage and emailing the admins with the failure history.",
      "outcome": "Outages are announced by the robot, with timestamps, before the first human notices.",
      "impact": "Faster recovery and no more silent report-delivery gaps.",
      "stack": ["n8n", "HTTP health probes", "Retry orchestration", "SSRS"],
      "exhibit": { "type": "demo", "demo": "ssrs-monitor" },
      "links": []
    },
    {
      "id": "ops-portal",
      "title": "Operations Portal with RBAC",
      "subtitle": "A single pane of glass for the automation fleet - each person sees only their modules",
      "period": "2026 - rolling out",
      "year": "2026",
      "status": "ROLLOUT",
      "category": "work",
      "featured": false,
      "problem": "Operations data lived in scattered lists and inboxes. Different teams needed different slices, and nobody needed everything.",
      "action": "Built a lightweight web portal over the automation fleet's data with group-based access control: users belong to groups, groups grant modules, and the UI assembles itself from what you are allowed to see. Data flows in through an automation bridge instead of direct credentials.",
      "outcome": "One URL for operations status. Adding a person is a group assignment, not a development task.",
      "impact": "Managers self-serve their own answers instead of asking for exports.",
      "stack": ["Python Flask", "SQLite", "RBAC design", "SharePoint bridge"],
      "exhibit": { "type": "demo", "demo": "ops-portal" },
      "links": []
    },
    {
      "id": "work-record",
      "title": "Work Record Automation",
      "subtitle": "Log achievements once - get branded slide decks and resumes generated for free",
      "period": "2026 - completed",
      "year": "2026",
      "status": "DONE",
      "category": "work",
      "featured": false,
      "problem": "Good work disappears if you do not write it down. Assembling review presentations and resumes from scratch every time wastes the effort twice.",
      "action": "Built a local web app where each piece of work is logged once with its screenshots and scripts. It rolls everything into an Excel summary, then generates branded PowerPoint decks - with an AI vision model choosing the best screenshots per slide - and exports a formatted resume from the same data.",
      "outcome": "A living achievement database that compiles itself into presentation and job-application material on demand.",
      "impact": "Review prep went from a weekend to a button.",
      "stack": ["Python Flask", "python-pptx / docx", "Claude vision", "Multi-provider AI fallback"],
      "exhibit": { "type": "demo", "demo": "work-record" },
      "links": []
    },
    {
      "id": "student-routine-organizer",
      "title": "Student Routine Organizer",
      "subtitle": "A team-built routine web app - I owned the habit tracker, streaks and all",
      "period": "2025 - team of 4, UTAR",
      "year": "2025",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Student life scatters across apps: workouts in one place, diary in another, money and habits nowhere. Our team of four set out to put a student's whole routine under one login.",
      "action": "A PHP + MySQL web application on a 3-tier architecture with shared authentication and an admin area, one module per member. I built the Habit Tracker end to end: habits with category, frequency and regular-or-timer type; mark/unmark today with streak tracking; a weekly progress bar; timer habits that log themselves when stopped; a history log; and search plus filters across name, category and status.",
      "outcome": "Four modules - habits, exercise, diary and money tracking - working as one coherent app, plus an admin dashboard with user management and backups.",
      "impact": "Building my slice of a system that has to fit three other people's slices - the useful kind of teamwork practice.",
      "stack": ["PHP", "MySQL", "3-tier architecture", "HTML / CSS", "Team of 4"],
      "exhibit": { "type": "demo", "demo": "routine-habits" },
      "links": [{ "label": "GitHub", "url": "https://github.com/Junhui20/Student-Routine-Organizer" }]
    },
    {
      "id": "mindharmony",
      "title": "MindHarmony",
      "subtitle": "An Android mental-health companion with an AI support chatbot",
      "period": "2025 - team project, UTAR",
      "year": "2025",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "University stress is real and support is not always within reach - we wanted a companion that lives in your pocket and never judges.",
      "action": "A native Android app in Java: an AI emotional-support chatbot with selectable companion characters, mood tracking with an emoji journal and calendar view, guided mindfulness sessions (meditation, focus, relax, study and timer modes), a personalised wellness plan and reminder notifications - with moods and activities stored locally in SQLite.",
      "outcome": "A working mental-wellness companion covering chat, tracking and mindfulness in one app.",
      "impact": "Technology that looks after the user, not just the task.",
      "stack": ["Java", "Android", "SQLite", "AI chatbot"],
      "exhibit": { "type": "demo", "demo": "mindharmony" },
      "links": [{ "label": "GitHub", "url": "https://github.com/WeeXinnn/mindHarmony" }]
    },
    {
      "id": "ai-waste-sorting",
      "title": "Eco-Assistant - AI Waste Sorting",
      "subtitle": "Snap a photo of your trash, learn how to recycle it and what it is worth",
      "period": "2024 - 5-day AI in Application Design training",
      "year": "2024",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Most people cannot tell what is recyclable, let alone what it is worth - so everything ends up in one bin.",
      "action": "In a five-day AI application training during my UTAR degree, our team of four built a Streamlit assistant: ask recycling questions in chat, or upload a photo of waste and a vision model classifies the material, explains how to recycle or reuse it and quotes market prices in MYR; a second model suggests recycling centres near the location you enter.",
      "outcome": "A working AI web assistant - chat, image analysis, price lookup and centre suggestions - shipped inside the five-day window.",
      "impact": "Proof of how fast an idea can become a usable AI product.",
      "stack": ["Python", "Streamlit", "Gemini vision", "OpenAI API"],
      "exhibit": { "type": "demo", "demo": "eco-sort" },
      "links": [{ "label": "GitHub", "url": "https://github.com/jooyeechang/AIwastesortingsystem" }]
    },
    {
      "id": "ar-fire-extinguisher",
      "title": "AR Fire Extinguisher",
      "subtitle": "Point your phone at a marker and a CO2 extinguisher appears in the room",
      "period": "2025 - UTAR coursework",
      "year": "2025",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Most people have never held a fire extinguisher - the steps live on posters nobody reads until the day they matter.",
      "action": "A marker-based mobile AR app in Unity (AR Foundation on ARCore / ARKit): point the camera at a printed marker and a realistically scaled CO2 extinguisher spawns in front of you. On-screen buttons rotate it, a parts mode highlights the pin, handle and hose with descriptions, world-space panels explain which fire classes CO2 handles - and which it must never touch - a spray button plays the discharge effect, and a spatial-audio walkthrough talks through pull, aim, squeeze, sweep. Tested on Android.",
      "outcome": "A pocket AR trainer that turns one printed marker into a hands-on extinguisher lesson.",
      "impact": "The same conviction as my FYP: serious skills stick better when they are learned through play.",
      "stack": ["Unity", "AR Foundation (ARCore / ARKit)", "C#", "Visual Scripting", "Android"],
      "exhibit": { "type": "demo", "demo": "ar-fire-tabs" },
      "links": []
    },
    {
      "id": "vr-fire-extinguisher",
      "title": "Fire Extinguisher Training - VR Simulation",
      "subtitle": "Grab a virtual CO2 extinguisher and put out a factory fire - properly",
      "period": "2025 - UTAR coursework, team project",
      "year": "2025",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Real extinguisher drills are expensive, messy and rarely repeatable - most people get one try, years ago, if at all.",
      "action": "A VR training simulation in Unity with the XR Interaction Toolkit, set in a factory scene: grab the CO2 extinguisher with your controller and hold the trigger to spray - particles, hissing audio, a nozzle collider doing the real work. Fires are simulated properly too: each fire source has health, shrinks as you hit it at the base, and can regrow if you stop too early, with a progress bar tracking the extinguish.",
      "outcome": "Repeatable fire-safety practice with zero real-world risk - reset the scene and drill again.",
      "impact": "VR as a training tool, not just entertainment.",
      "stack": ["Unity", "XR Interaction Toolkit", "C#", "VR"],
      "exhibit": { "type": "demo", "demo": "vr-extinguisher" },
      "links": []
    },
    {
      "id": "math-adventure",
      "title": "Math Adventure",
      "subtitle": "A Flutter app that turns primary-school math into a game",
      "period": "2025 - UTAR coursework",
      "year": "2025",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Math drills are the homework everyone avoids - practice only works if children actually want to keep going.",
      "action": "A cross-platform Flutter app for early arithmetic, each skill wrapped as its own game module behind a kid-friendly home screen: compare numbers (greater or less), compose numbers through addition and subtraction, order numbers ascending and descending, and practise number bonds.",
      "outcome": "Math practice that feels like playing, not studying - one codebase running on Android, iOS and the web.",
      "impact": "Learning through play, the same theme that grew into my FYP.",
      "stack": ["Flutter", "Dart", "Android / iOS / Web"],
      "exhibit": { "type": "demo", "demo": "math-adventure" },
      "links": []
    },
    {
      "id": "stock-management",
      "title": "Stock Management System",
      "subtitle": "A JavaFX desktop app that keeps appliance stock in order",
      "period": "2024 - UTAR coursework (OOP)",
      "year": "2024",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "The assignment: manage a store's appliance inventory properly - with real object-oriented design, not a spreadsheet.",
      "action": "A JavaFX desktop application with user login and an object-oriented product model: air conditioners, blenders, refrigerators, smartphones and TVs all extending one Product base class, displayed in live observable table views with sorting and filtering, plus dialogs for stocking in, selling and editing products.",
      "outcome": "A complete CRUD desktop app that demonstrates inheritance and polymorphism doing actual work.",
      "impact": "OOP fundamentals applied to something that behaves like a real tool.",
      "stack": ["Java", "JavaFX", "OOP design"],
      "exhibit": { "type": "demo", "demo": "stockfx" },
      "links": [{ "label": "GitHub", "url": "https://github.com/xueenng/Stock_Management_System" }]
    },
    {
      "id": "fruit-stall-inventory",
      "title": "Fruit Stall Inventory System",
      "subtitle": "A C++ console system that keeps a fruit stall stocked and profitable",
      "period": "2023 - UTAR coursework",
      "year": "2023",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "A fruit stall lives or dies by knowing what is in stock and what it cost - the exercise was to build that bookkeeping from scratch.",
      "action": "A menu-driven C++ console application managing fruit inventory and cost-of-goods records, persisted to files so the stall's data survives between sessions - stocking, selling and reporting flows included.",
      "outcome": "A self-contained inventory manager in a single well-structured C++ program.",
      "impact": "File-based persistence and structured console UX before any framework did it for me.",
      "stack": ["C++", "File I/O", "Console UI"],
      "exhibit": { "type": "demo", "demo": "fruit-stall" },
      "links": [{ "label": "GitHub", "url": "https://github.com/xueenng/Fruit-Stall-Inventory-Management-System" }]
    },
    {
      "id": "food-ordering",
      "title": "Food Ordering System",
      "subtitle": "A 17-table Oracle database design for a food-ordering business",
      "period": "2024 - team of 4, UTAR (database course)",
      "year": "2024",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "Behind every food-ordering app is a relational model that has to get people, menus, orders and payments exactly right.",
      "action": "An Oracle SQL group assignment: a 17-table relational design built on supertype/subtype modelling - one PERSON hierarchy branching into managers, contract and part-time employees; customers split into members (with membership levels) and guests - plus orders, order items, a categorised food catalogue and payments, with the SQL scripts to create and query all of it.",
      "outcome": "A normalised, constraint-complete schema covering the full ordering flow from customer to payment.",
      "impact": "The SQL foundation I now use daily in ERP and reporting work.",
      "stack": ["Oracle SQL", "ER modelling", "Supertype / subtype design"],
      "exhibit": { "type": "demo", "demo": "food-ordering" },
      "links": []
    },
    {
      "id": "library-student-management",
      "title": "Library Student Management System",
      "subtitle": "A C++ library system on a hand-built linked list - overdues computed the hard way",
      "period": "2023 - UTAR coursework (data structures)",
      "year": "2023",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "A library needs to know its members, what they borrowed and when it is due - and the assignment forbade ready-made containers.",
      "action": "C++ coursework built on hand-written data structures: a custom linked list holds students and their borrowed books, records load from and save back to text files, and due dates run on Julian-day calendar math to flag overdue books and warned students - plus search, borrowing statistics and who-else-borrowed-this-book queries through a menu-driven, input-validated CLI.",
      "outcome": "A complete library records system where every data structure underneath is mine.",
      "impact": "Date math and pointer discipline learned the honest way.",
      "stack": ["C++", "Custom linked list", "File I/O", "Julian-day date math"],
      "exhibit": { "type": "demo", "demo": "library-loans" },
      "links": []
    },
    {
      "id": "student-record-bst",
      "title": "Student Records on a Binary Search Tree",
      "subtitle": "Data structures from scratch: a BST that files student records",
      "period": "2024 - UTAR coursework (data structures)",
      "year": "2024",
      "status": "DONE",
      "category": "academic",
      "featured": false,
      "problem": "The point was not to store student records - it was to build, by hand, the data structures that store them.",
      "action": "Implemented the structures from scratch in C++: a binary search tree holding student records with insert, search and traversals, plus a hand-rolled queue for level-order walks - loaded from file through a menu-driven CLI with validated input.",
      "outcome": "A working BST-backed records program with no library containers doing the heavy lifting.",
      "impact": "Knowing what a tree costs because I have paid for it in pointers.",
      "stack": ["C++", "Binary search tree", "Custom queue"],
      "exhibit": { "type": "demo", "demo": "bst-records" },
      "links": [{ "label": "GitHub", "url": "https://github.com/xueenng/Student_Record_BST" }]
    }
  ],
  "skills": [
    { "group": "Data & Reporting", "items": ["SQL", "SSRS", "Power BI", "Excel automation", "QNE ERP", "AutoCount", "FIFO stock valuation"] },
    { "group": "Automation", "items": ["n8n (self-hosted)", "PowerShell", "Office COM", "REST APIs", "Microsoft Graph", "SharePoint", "Docker"] },
    { "group": "Programming", "items": ["Python", "JavaScript", "Java", "C++", "C#", "HTML / CSS"] },
    { "group": "AI Engineering", "items": ["LLM vision OCR pipelines", "Prompt engineering", "Claude / GPT / Gemini APIs", "AI fallback chains"] },
    { "group": "Game & 3D", "items": ["Unity", "VR interaction design", "Blender", "Puzzle & level design"] },
    { "group": "Languages", "items": ["English", "Malay", "Mandarin", "Cantonese"] }
  ],
  "timeline": [
    {
      "period": "Mar 2026 - Present",
      "role": "Business System Analyst",
      "org": "Golden Pet Industries Sdn Bhd, Ipoh",
      "place": "Ipoh",
      "points": [
        "Own the company's self-hosted automation platform end to end",
        "Shipped the AI delivery-order pipeline, exchange-rate sync, notification hub and report-server watchdog into production",
        "Design SQL / SSRS reporting: FIFO stock valuation, month-end stock reports, anomaly detection"
      ]
    },
    {
      "period": "Oct 2024 - Jan 2025",
      "role": "IT Intern",
      "org": "Chuan Sin Sdn Bhd (Spritzer group), Taiping",
      "place": "Taiping",
      "points": [
        "Coordinated with external vendors on AutoCount setup - requirement clarification, system testing, deployment readiness",
        "System testing across AutoCount POS, Accounting and Epicor; cleaned and reorganised the stock master list",
        "Wrote requirement documents (DRD) and Test Execution Reports supporting UAT and knowledge transfer",
        "Business process analysis - identified inefficiencies and proposed system-supported improvements"
      ]
    },
    {
      "period": "2023 - 2026",
      "role": "B.CS (Honours), Computer Science",
      "org": "Universiti Tunku Abdul Rahman (UTAR)",
      "place": "Kampar",
      "points": [
        "President's List for 3 semesters and Dean's List for 2 semesters; awarded the China Ambassador Scholarship (2024)",
        "Final year project: Echoes in Kellie's Castle - a VR escape room of the real heritage site, modelled in Blender and built in Unity",
        "Focus on business systems and applied AI"
      ]
    },
    {
      "period": "2021 - 2022",
      "role": "Foundation in Science",
      "org": "Xiamen University Malaysia",
      "place": "Sepang",
      "points": [
        "Merit Scholarship for the Foundation in Science programme",
        "Director's Commendation for Academic Excellence, August 2022 trimester"
      ]
    },
    {
      "period": "2016 - 2020",
      "role": "SPM - Malaysian Certificate of Education",
      "org": "SMJK Perempuan Perak, Ipoh",
      "place": "Ipoh",
      "points": ["10 As (3A+, 4A, 3A-)"]
    }
  ],
  "achievementEras": {
    "work":       { "label": "Working world", "caption": "Golden Pet Industries Sdn Bhd - 2026 to present" },
    "university": { "label": "University", "caption": "B.CS (Honours), Universiti Tunku Abdul Rahman" },
    "foundation": { "label": "Foundation", "caption": "Foundation in Science, Xiamen University Malaysia" },
    "secondary":  { "label": "Secondary school", "caption": "SMJK Perempuan Perak, Ipoh" },
    "primary":    { "label": "Primary school", "caption": "Where it all started" }
  },
  "achievements": [
    {
      "id": "ach-presidents-list",
      "title": "President's List - 3 semesters",
      "org": "UTAR",
      "year": "2023 - 2024",
      "era": "university",
      "category": "academic",
      "description": "Named to the President's List three semesters running - the university's highest per-semester academic honour.",
      "image": ""
    },
    {
      "id": "ach-deans-list",
      "title": "Dean's List - 2 semesters",
      "org": "UTAR",
      "year": "2023 - 2024",
      "era": "university",
      "category": "academic",
      "description": "Dean's List honours in two further semesters - five award semesters in total.",
      "image": ""
    },
    {
      "id": "ach-china-ambassador",
      "title": "China Ambassador Scholarship",
      "org": "UTAR",
      "year": "2024",
      "era": "university",
      "category": "academic",
      "description": "Competitive scholarship awarded in recognition of academic excellence.",
      "image": ""
    },
    {
      "id": "ach-aws-cloud",
      "title": "AWS Cloud Foundations",
      "org": "AWS",
      "year": "",
      "era": "university",
      "category": "certification",
      "description": "Cloud computing fundamentals - services, architecture, security and pricing.",
      "image": ""
    },
    {
      "id": "ach-ai-app-design",
      "title": "AI in Application Design",
      "org": "UTAR",
      "year": "2024",
      "era": "university",
      "category": "certification",
      "description": "Completed the five-day intensive and shipped the Eco-Assistant AI waste-sorting app with a team of four.",
      "image": ""
    },
    {
      "id": "ach-muet",
      "title": "MUET Band 4.5",
      "org": "Malaysian University English Test",
      "year": "",
      "era": "university",
      "category": "certification",
      "description": "Operating comfortably in professional English - reading, writing, listening and speaking.",
      "image": ""
    },
    {
      "id": "ach-tech4good",
      "title": "Tech 4 Good Challenge",
      "org": "",
      "year": "2024",
      "era": "university",
      "category": "cocurricular",
      "description": "Certificate of Participation - putting technology to work for social good.",
      "image": ""
    },
    {
      "id": "ach-xmum-merit",
      "title": "Merit Scholarship",
      "org": "Xiamen University Malaysia",
      "year": "2021",
      "era": "foundation",
      "category": "academic",
      "description": "Entry scholarship awarded for the Foundation in Science programme.",
      "image": ""
    },
    {
      "id": "ach-xmum-commendation",
      "title": "Director's Commendation for Academic Excellence",
      "org": "Xiamen University Malaysia",
      "year": "2022",
      "era": "foundation",
      "category": "academic",
      "description": "Commended for academic excellence in the August 2022 trimester.",
      "image": ""
    },
    {
      "id": "ach-xmum-helper",
      "title": "Student Helper - Orientation & Registration",
      "org": "Xiamen University Malaysia",
      "year": "2022",
      "era": "foundation",
      "category": "volunteering",
      "description": "Guided new students through registration day - forms, handbooks and campus directions.",
      "image": ""
    },
    {
      "id": "ach-spm",
      "title": "SPM: 10 As (3A+, 4A, 3A-)",
      "org": "SMJK Perempuan Perak",
      "year": "2020",
      "era": "secondary",
      "category": "academic",
      "description": "Straight As across all ten subjects in the Malaysian Certificate of Education.",
      "image": ""
    },
    {
      "id": "ach-1119",
      "title": "1119 (GCE-O) English - 1A",
      "org": "",
      "year": "2020",
      "era": "secondary",
      "category": "certification",
      "description": "Top grade in the O-Level-equivalent English paper.",
      "image": ""
    }
  ],
  "contact": {
    "message": "The fastest way to see what I do is to run any project above - or wander through the castle gallery. If you would like the same kind of systems (or worlds) in your team, send a letter my way.",
    "cta": "Send me a letter"
  },
  "footer": "Hand-built with plain HTML, CSS and JavaScript - no frameworks, no build step, edited live from the site itself. There is one secret in here for those who remember the code.",
  "resume": {
    "headline": "Final Year Computer Science Student",
    "graduation": "Expected Graduation: Feb 2026",
    "phone": "016-562 7388",
    "objective": "Aspiring final-year Computer Science student with hands-on experience in requirements documentation (DRD), business process analysis, system testing, and SQL. Seeking a junior Business System Analyst role to support data-driven decision-making, optimise business processes, and develop technical and analytical skills.",
    "experience": [
      {
        "role": "Information Technology Intern",
        "org": "Chuan Sin Sdn Bhd, Taiping, Perak",
        "period": "Oct 2024 - Jan 2025",
        "bullets": [
          "Coordinated with external vendors during AutoCount system setup and configuration, supporting requirement clarification, system testing, and deployment readiness.",
          "Cleaned and reorganised stock master data to improve data accuracy and management.",
          "Prepared system documentation, including Document Requirement Documents (DRD) and Test Execution Reports, supporting system validation, user acceptance testing (UAT), and knowledge transfer.",
          "Assisted in business process analysis and workflow optimisation by identifying operational inefficiencies and proposing system-supported improvements aligned with business requirements."
        ]
      }
    ],
    "projects": [
      {
        "id": "vr-escape-room",
        "title": "Echoes in Kellie's Castle: A Virtual Escape Room",
        "period": "Jun 2024 - Dec 2025",
        "bullets": [
          "Conducted requirement analysis and translated learning objectives into system features for a VR-based heritage tourism application.",
          "Designed system flow, use cases, and user interaction logic to support immersive learning.",
          "Performed user acceptance testing (UAT) and analyzed feedback to evaluate system effectiveness."
        ]
      },
      {
        "id": "student-routine-organizer",
        "title": "Student Routine Organizer",
        "period": "Jul 2025 - Aug 2025",
        "bullets": [
          "Analyzed user and functional requirements and translated them into system workflows and database design.",
          "Designed and implemented CRUD operations and SQL reporting queries to track routines such as expenses, habits, and exercise.",
          "Developed a 3-tier architecture system using PHP and MySQL, ensuring separation of presentation, business logic, and data layers."
        ]
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Computer Science (Honours)",
        "org": "Universiti Tunku Abdul Rahman",
        "period": "Jan 2023 - Present",
        "note": "President's List Award & Dean's List Award (Current CGPA: 3.67)"
      },
      {
        "degree": "Foundation in Science",
        "org": "Xiamen University Malaysia",
        "period": "Dec 2021 - Dec 2022",
        "note": "Director's Commendation for Academic Excellence, August 2022 Trimester (CGPA 3.39)"
      },
      {
        "degree": "Malaysian Certificate of Education (SPM)",
        "org": "Sekolah Menengah Jenis Kebangsaan Perempuan Perak",
        "period": "Jan 2016 - Dec 2020",
        "note": "10 As (3A+, 4A, 3A-)"
      }
    ],
    "additional": [
      { "label": "Technical Skills", "value": "Java, C++, C#, Python, HTML, SQL, Microsoft Office Suite, AutoCount, Draw.io, Blender, Unity" },
      { "label": "Certifications", "value": "AWS Cloud Foundations, Malaysian University English Test (Band 4.5)" },
      { "label": "Languages", "value": "English, Malay, Mandarin, Cantonese" },
      { "label": "Awards / Activities", "value": "AI in Application Design Certificate of Completion, Tech 4 Good Challenge Certificate of Participation" }
    ]
  }
};
