/**
 * Calculates the full monthly settlement waterfall for a property group.
 * Ported from Property Pulse standalone → PM workspace engine.
 *
 * 9-step waterfall:
 * 1. Gross rent (sum of unit monthly_rent for the group)
 * 2. Fixed expenses (PMExpense type=expense for month + group, excluding labor)
 * 3. Management fee (gross_rent * group.management_fee_pct%)
 * 4. Maintenance reserve (gross_rent * group.maintenance_reserve_pct%)
 * 5. Emergency reserve (gross_rent * group.emergency_reserve_pct%, capped)
 * 6. Labor costs (PMLaborEntry for month + group properties)
 * 6.5 Manager reimbursements (expenses paid_by=manager, pending/included)
 * 7. Net distributable (gross - all deductions)
 * 8. Primary distributions (PMOwnershipStake percentages)
 * 9. Secondary splits (PMDistributionSplit adjustments)
 *
 * @param {string} groupId
 * @param {string} month - "YYYY-MM"
 * @param {Object} allData - { groups, properties, expenses, laborEntries, owners, ownershipStakes, distributionSplits }
 * @returns {Object|null} Settlement waterfall result
 */
export function calculateSettlement(groupId, month, allData) {
  const {
    groups = [],
    properties = [],
    expenses = [],
    laborEntries = [],
    owners = [],
    ownershipStakes = [],
    distributionSplits = [],
  } = allData;

  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const monthStr = month != null && typeof month === 'string' ? month : String(month ?? '').slice(0, 7);
  if (!monthStr || monthStr.length < 7) return null;

  const units = properties.filter((p) => p.group_id === groupId);
  const unitIds = new Set(units.map((u) => u.id));
  const managerOwner = owners.find(
    (o) => (o.role || '').toLowerCase() === 'manager' || (o.role || '').toLowerCase() === 'both'
  );

  // STEP 1: GROSS RENT
  const gross_rent = units.reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);

  // STEP 2: FIXED EXPENSES for this month + group
  const monthExpenses = expenses.filter((e) => {
    if (e.group_id !== groupId) return false;
    const expDate = e.date ? String(e.date).slice(0, 7) : '';
    return expDate === monthStr;
  });
  const total_fixed_expenses = monthExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // STEP 3-5: Fee and reserves from group percentages
  const mgmtPct = Number(group.management_fee_pct) || 10;
  const maintPct = Number(group.maintenance_reserve_pct) || 10;
  const emergPct = Number(group.emergency_reserve_pct) || 5;
  const management_fee = Math.round(gross_rent * (mgmtPct / 100) * 100) / 100;
  const maintenance_reserve = Math.round(gross_rent * (maintPct / 100) * 100) / 100;
  const emergency_reserve = Math.round(gross_rent * (emergPct / 100) * 100) / 100;

  // STEP 6: LABOR COSTS for this month + group properties
  const [year, monthNum] = monthStr.split('-').map(Number);
  const monthLabor = laborEntries.filter((l) => {
    if (!unitIds.has(l.property_id)) return false;
    const d = l.date ? String(l.date) : '';
    const [ly, lm] = d.slice(0, 7).split('-').map(Number);
    return ly === year && lm === monthNum;
  });
  const total_labor_costs = monthLabor.reduce(
    (sum, l) => sum + (Number(l.total) ?? (Number(l.hourly_rate) || 0) * (Number(l.hours) || 0)),
    0
  );

  // STEP 6.5: MANAGER REIMBURSEMENTS
  const reimbursableExpenses = monthExpenses.filter((e) => {
    const paidBy = (e.paid_by || 'property').toLowerCase();
    const status = (e.reimbursement_status || 'not_applicable').toLowerCase();
    return paidBy === 'manager' && (status === 'pending' || status === 'included_in_settlement');
  });
  const total_reimbursements = reimbursableExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // STEP 7: NET DISTRIBUTABLE
  const net_distributable =
    gross_rent -
    total_fixed_expenses -
    management_fee -
    maintenance_reserve -
    emergency_reserve -
    total_labor_costs -
    total_reimbursements;

  // STEP 8: PRIMARY DISTRIBUTIONS by ownership stake
  const stakes = ownershipStakes.filter((s) => s.group_id === groupId);
  const distributions = stakes.map((stake) => {
    const owner = owners.find((o) => o.id === stake.owner_id);
    const gross_amount = (net_distributable * (Number(stake.ownership_pct) || 0)) / 100;
    return {
      owner_id: stake.owner_id,
      owner_name: owner ? owner.name : 'Unknown',
      ownership_pct: Number(stake.ownership_pct) || 0,
      gross_amount: Math.round(gross_amount * 100) / 100,
      splits: [],
      received_splits: [],
      net_amount: Math.round(gross_amount * 100) / 100,
    };
  });

  // STEP 9: SECONDARY SPLITS
  const splits = distributionSplits.filter((s) => s.group_id === groupId);
  for (const split of splits) {
    const fromDist = distributions.find((d) => d.owner_id === split.from_owner_id);
    if (!fromDist) continue;
    const splitAmount =
      Math.round(((fromDist.gross_amount * (Number(split.split_pct) || 0)) / 100) * 100) / 100;
    const toOwner = owners.find((o) => o.id === split.to_owner_id);
    const toOwnerName = toOwner ? toOwner.name : 'Unknown';

    fromDist.splits.push({
      to_owner_id: split.to_owner_id,
      to_owner_name: toOwnerName,
      split_pct: Number(split.split_pct) || 0,
      amount: splitAmount,
      reason: split.reason || null,
    });
    const totalGiven = fromDist.splits.reduce((s, sp) => s + sp.amount, 0);
    fromDist.net_amount = Math.round((fromDist.gross_amount - totalGiven) * 100) / 100;

    let toDist = distributions.find((d) => d.owner_id === split.to_owner_id);
    if (toDist) {
      toDist.net_amount = Math.round((toDist.net_amount + splitAmount) * 100) / 100;
      if (!toDist.received_splits) toDist.received_splits = [];
      toDist.received_splits.push({
        from_owner_name: fromDist.owner_name,
        split_pct: split.split_pct,
        amount: splitAmount,
      });
    } else {
      distributions.push({
        owner_id: split.to_owner_id,
        owner_name: toOwnerName,
        ownership_pct: 0,
        gross_amount: 0,
        splits: [],
        received_splits: [
          {
            from_owner_name: fromDist.owner_name,
            split_pct: split.split_pct,
            amount: splitAmount,
          },
        ],
        net_amount: splitAmount,
      });
    }
  }

  // STEP 6.5b: Add reimbursement to manager distribution entry
  if (total_reimbursements > 0 && managerOwner) {
    const managerDist = distributions.find((d) => d.owner_id === managerOwner.id);
    if (managerDist) {
      managerDist.reimbursement = Math.round(total_reimbursements * 100) / 100;
      managerDist.net_amount = Math.round((managerDist.net_amount + total_reimbursements) * 100) / 100;
    }
  }

  return {
    group_id: groupId,
    month: monthStr,
    gross_rent,
    total_fixed_expenses,
    management_fee,
    maintenance_reserve,
    emergency_reserve,
    total_labor_costs,
    total_reimbursements,
    reimbursable_expenses: reimbursableExpenses,
    month_expenses: monthExpenses,
    month_labor: monthLabor,
    units,
    net_distributable: Math.round(net_distributable * 100) / 100,
    distributions,
    group,
  };
}

/** Format "2026-02" -> "February 2026". */
export function formatMonthDisplay(monthStr) {
  if (!monthStr || typeof monthStr !== 'string') return 'Unknown';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const date = new Date(parts[0], parts[1] - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Get current month as "YYYY-MM". */
export function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
