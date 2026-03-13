/**
 * Get previous month in YYYY-MM format.
 * @param {string} monthStr - "YYYY-MM"
 * @returns {string|null} Previous month "YYYY-MM"
 */
export function getPreviousMonth(monthStr) {
  if (!monthStr || monthStr.length < 7) return null;
  const [y, m] = monthStr.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Get ALL expenses from the previous month for the group that are not already
 * entered for the current month. Each candidate gets preChecked: true if
 * is_recurring, false otherwise.
 * @param {Array} expenses - All expenses
 * @param {string} groupId - Property group ID
 * @param {string} monthStr - Current month "YYYY-MM"
 * @returns {Array} Candidate expenses to carry forward
 */
export function getRecurringCandidates(expenses, groupId, monthStr) {
  const prevMonth = getPreviousMonth(monthStr);
  if (!prevMonth || !expenses || !groupId) return [];

  const prevExpenses = expenses.filter((e) => {
    if (e.group_id !== groupId) return false;
    const d = e.date ? String(e.date).slice(0, 7) : '';
    return d === prevMonth;
  });

  const currentMonthExpenses = expenses.filter((e) => {
    if (e.group_id !== groupId) return false;
    const d = e.date ? String(e.date).slice(0, 7) : '';
    return d === monthStr;
  });

  const currentKeys = new Set(
    currentMonthExpenses.map(
      (e) => `${e.category}|${Number(e.amount)}|${e.property_id || ''}`
    )
  );

  return prevExpenses
    .filter(
      (e) =>
        !currentKeys.has(
          `${e.category}|${Number(e.amount)}|${e.property_id || ''}`
        )
    )
    .map((e) => ({ ...e, preChecked: e.is_recurring === true }));
}
