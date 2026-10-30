/* Layout overrides saved by the scene editor (admin -> Scene layout).

   UNITS DIFFER BY SCENE, so do not copy a number between them:
   - hall    fractions (0-1) of the VISIBLE ROOM, not of the painting behind it
   - toolbox PERCENT (0-100) of the .tb-stage box, except chest.max which is px
   - do-rename x/y are percent offsets of each asset's containing box;
               sx/sy are independent scale factors

   Migrated when the shelf art changed: 01_Shelf_Long_1 is 10.30:1 with a
   quarter of its height as solid board, so shelf.sy goes back to 1.0 -
   the 0.38 squeeze existed only to thin a 4:1 shelf and left 14px of
   wood. The rack also stops at 0.75, where the filter column begins. */
window.SCENE_LAYOUT = {
  "hall": {
    "shelf.y.0": 0.32,
    "shelf.x0.0": 0.3,
    "shelf.x1.0": 0.79,
    "shelf.sy.0": 1.0,
    "shelf.y.1": 0.55,
    "shelf.x0.1": 0.3,
    "shelf.x1.1": 0.79,
    "shelf.sy.1": 1.0,
    "shelf.y.2": 0.78,
    "shelf.x0.2": 0.3,
    "shelf.x1.2": 0.79,
    "shelf.sy.2": 1.0,
    "cert.height": 0.18,
    "title.signH": 0.6789,
    "title.signW": 0.52,
    "suu.left": 0.1,
    "tags.w": 0.078
  },
  /* Counter replacement tuned2026-10-21. Keys absent here use TB_DEFAULTS. */
  "toolbox": {
    "bench.w": 97.438,
    "bench.b": -18.12,
    "deck": 22.2881,
    "row.x0": 18.2922,
    "row.x1": 18.9751,
    "suu.x": 9.7365,
    "suu.w": 5.5657,
    "head.w": 24.2436
  },
  "do-rename": {},
  "_meta": {
    "savedAt": "2026-08-12",
    "fingerprint": "1535x1024|1200x302|0.2163|0.1973|0.9268",
    "toolboxFingerprint": "bg1500x844|counter2172x724|stage1500:844",
    "doRenameSavedAt": "2026-10-05",
    "doRenameFingerprint": "painted-mill-v3|1774x887"
  }
};
