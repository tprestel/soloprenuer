/**
 * Search module — filter tab groups by query string
 * Searches across: group titles, custom names, tab titles, and tab URLs
 */

/**
 * Search groups by query. Returns matching groups with matchingTabIndices.
 * @param {Array} groups - array of tab group objects
 * @param {string} query - search string
 * @returns {Array} filtered groups, each with a `matchingTabIndices` array
 */
export function searchGroups(groups, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return groups;

  return groups
    .map((group) => {
      const matchingTabIndices = [];

      // Check group title
      const titleMatch = group.title.toLowerCase().includes(trimmed);

      // Check custom name
      const nameMatch = group.customName
        ? group.customName.toLowerCase().includes(trimmed)
        : false;

      // Check each tab
      group.tabs.forEach((tab, index) => {
        const tabTitleMatch = tab.title.toLowerCase().includes(trimmed);
        const tabUrlMatch = tab.url.toLowerCase().includes(trimmed);
        if (tabTitleMatch || tabUrlMatch) {
          matchingTabIndices.push(index);
        }
      });

      const isMatch = titleMatch || nameMatch || matchingTabIndices.length > 0;

      if (isMatch) {
        return { ...group, matchingTabIndices };
      }
      return null;
    })
    .filter(Boolean);
}
