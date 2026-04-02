(function () {
  if (typeof window === 'undefined') return;
  var p = window.performance || (window.performance = {});
  if (typeof p.mark !== 'function') p.mark = function () {};
  if (typeof p.measure !== 'function') p.measure = function () {};
  if (typeof p.clearMarks !== 'function') p.clearMarks = function () {};
  if (typeof p.clearMeasures !== 'function') p.clearMeasures = function () {};
  if (typeof p.getEntriesByName !== 'function') p.getEntriesByName = function () { return []; };
})();
