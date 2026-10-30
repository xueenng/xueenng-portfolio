/* Refresh known old resume defaults without replacing owner-authored content.
   Shared by the main page, resume/PDF and admin editor; never writes storage. */
(function () {
  "use strict";
  var legacy = {
    headline: "Business System Analyst | Computer Science Student | Applied AI & Automation",
    graduation: "Graduation: Jan 2026",
    objective: "Aspiring business system analyst with hands-on experience in requirements documentation (DRD), business process analysis, system testing, and SQL. I design AI-driven document automation and ERP data integrations that turn manual, repetitive work into self-running systems \u2014 supporting faster, data-informed decisions across the business."
  };
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function upgrade(content, base) {
    var result = copy(content), defaults = base && base.resume;
    if (!defaults) return result;
    if (!result.resume) { result.resume = copy(defaults); return result; }
    var resume = result.resume;
    var wasLegacy = resume.headline === legacy.headline || resume.objective === legacy.objective;
    Object.keys(legacy).forEach(function (key) {
      if (resume[key] === legacy[key]) resume[key] = defaults[key];
    });
    if (wasLegacy && Array.isArray(resume.experience) && defaults.experience && defaults.experience[0]) {
      var hasCurrent = resume.experience.some(function (entry) {
        return /golden\s*pet\s*industries/i.test(entry.org || "");
      });
      if (!hasCurrent) resume.experience.unshift(copy(defaults.experience[0]));
    }
    return result;
  }
  window.PORTFOLIO_RESUME_CONTENT = { upgrade: upgrade };
})();
