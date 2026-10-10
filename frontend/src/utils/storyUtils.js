/**
 * storyUtils.js
 * Utility helpers for clean, consistent formatting of Agile User Stories & sub-tasks.
 */

/**
 * Cleans user story titles so they start directly with actionable intent 'To ...',
 * stripping away verbose prefixes like 'As a System User, I want to', 'As a User, I want to', etc.
 * Also cleans legacy subtask brackets [Part X: ...] into clear deliverable phrases.
 */
export const cleanStoryTitle = (rawTitle) => {
  if (!rawTitle) return '';
  let str = String(rawTitle).trim();

  // If title has legacy "[Part X: ...]", extract and format cleanly
  const partMatch = str.match(/\[(Part\s*\d+[^\]]*)\]/i);
  if (partMatch) {
    const partTag = partMatch[1].replace(/^Part\s*\d+\s*:\s*/i, '').trim();
    str = str.replace(/\[Part\s*\d+[^\]]*\]/i, '').trim();
    str = str.replace(/^(?:as\s+(?:an?|the)\s+[^,]+,\s*)?i\s+want\s+(?:to\s+)?/i, '').trim();
    str = str.replace(/^the\s+system\s+(?:shall|should|must)\s+(?:allow\s+[^,]+\s+to\s+)?/i, '').trim();
    str = str.replace(/^to\s+/i, '').trim();
    const core = str.split(/\s+so\s+that\s+|\s+in\s+order\s+to\s+/i)[0].trim();
    return `To implement ${partTag} for ${core}`;
  }

  // Strip prefixes like "As a ..., I want to", "I want to", "The system shall allow ... to"
  str = str.replace(/^(?:as\s+(?:an?|the)\s+[^,]+,\s*)?i\s+want\s+(?:to\s+)?/i, 'To ');
  str = str.replace(/^the\s+system\s+(?:shall|should|must)\s+(?:allow\s+[^,]+\s+to\s+)?/i, 'To ');

  // Ensure starts with capitalized "To "
  if (/^to\s+/i.test(str)) {
    str = 'To ' + str.slice(3).trim();
  } else {
    str = 'To ' + (str.charAt(0).toLowerCase() + str.slice(1));
  }

  return str.trim();
};
