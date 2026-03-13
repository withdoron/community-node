import React from 'react';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n ?? 0);
}

/**
 * Distribution breakdown section within a settlement detail.
 * Shows manager fee line + per-owner distributions with splits.
 */
export default function SettlementDistributions({
  distributions,
  managerName,
  managementFee,
}) {
  const dists = distributions || [];

  return (
    <div className="border-t border-slate-700 my-4 pt-4">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
        Distribution Breakdown
      </h4>

      {/* Manager fee line */}
      {managerName && managementFee > 0 && (
        <div className="flex items-center justify-between py-2 border-b border-slate-700/50 mb-2">
          <span className="text-slate-300">
            {managerName} (Management Fee)
          </span>
          <span className="font-bold text-amber-500">
            {formatCurrency(managementFee)}
          </span>
        </div>
      )}

      {/* Owner distributions */}
      {dists.map((dist, i) => (
        <div
          key={i}
          className="py-2 border-b border-slate-700/50 last:border-0 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-100 font-medium">
              {dist.owner_name}
            </span>
            <span className="text-amber-500 font-bold">
              {formatCurrency(dist.net_amount)}
            </span>
          </div>
          <div className="text-xs text-slate-400 pl-0">
            {dist.ownership_pct > 0 && (
              <span>
                {dist.ownership_pct}% ownership →{' '}
                {formatCurrency(dist.gross_amount)} gross
              </span>
            )}
            {dist.splits &&
              dist.splits.length > 0 &&
              dist.splits.map((sp, j) => (
                <div key={j} className="mt-0.5">
                  Gives {sp.split_pct}% to {sp.to_owner_name}: -
                  {formatCurrency(sp.amount)}
                </div>
              ))}
            {dist.received_splits &&
              dist.received_splits.length > 0 &&
              dist.received_splits.map((rs, j) => (
                <div key={j} className="mt-0.5">
                  Receives {rs.split_pct}% from {rs.from_owner_name}: +
                  {formatCurrency(rs.amount)}
                </div>
              ))}
            {dist.reimbursement > 0 && (
              <p className="text-sm text-slate-400 mt-0.5">
                Reimbursement: +{formatCurrency(dist.reimbursement)}
              </p>
            )}
          </div>
        </div>
      ))}

      {dists.length === 0 && (
        <p className="text-sm text-slate-500">
          No ownership stakes configured for this group.
        </p>
      )}
    </div>
  );
}
