import React, { useState, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import FlagFootballField from '@/components/field/FlagFootballField';
import PositionMarker from '@/components/field/PositionMarker';
import RoutePath from '@/components/field/RoutePath';
import RouteDrawCanvas from '@/components/field/RouteDrawCanvas';
import RouteSelector from './RouteSelector';
import {
  FLAG_FOOTBALL,
  OFFENSE_ROUTES,
  DEFAULT_FORMAT,
  CUSTOM_POSITION_COLORS,
  getPositionsForFormat,
  getFormationDefaults,
  buildChainedRoutePath,
  ROUTE_SEGMENT_DEFAULTS,
  TAG_OPTIONS,
} from '@/config/flagFootball';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const viewBox = FLAG_FOOTBALL.field.viewBox;
const offenseFormations = FLAG_FOOTBALL.formations.offense;

/**
 * Visual Play Builder — coach places positions on an SVG field,
 * assigns routes (preset or freehand), and saves the play.
 */
export default function PlayBuilder({
  team,
  initialPlay = null,
  initialAssignments = [],
  onSave,
  onCancel,
  currentUserId,
}) {
  const formatId = team?.format || DEFAULT_FORMAT;
  const configPositions = getPositionsForFormat(formatId);

  // ——— State ———
  const [playName, setPlayName] = useState(initialPlay?.name || '');
  const [formation, setFormation] = useState(
    initialPlay?.formation?.toLowerCase() || 'spread'
  );
  const [gameDayFlag, setGameDayFlag] = useState(initialPlay?.game_day || false);
  const [isMirrorable, setIsMirrorable] = useState(
    initialPlay?.is_mirrorable || false
  );
  const [coachNotes, setCoachNotes] = useState(initialPlay?.coach_notes || '');
  const [tags, setTags] = useState(() => {
    if (!initialPlay?.tags) return [];
    return initialPlay.tags.split(',').map((t) => t.trim()).filter(Boolean);
  });

  // Position state: { [positionId]: { x, y, posConfig } }
  const [positions, setPositions] = useState(() => {
    if (initialAssignments.length > 0) {
      // Edit mode: load from assignments
      const map = {};
      initialAssignments.forEach((a) => {
        if (a.start_x != null && a.start_y != null) {
          const posConfig = configPositions.find((p) => p.id === a.position) || {
            id: a.position,
            shortLabel: a.position,
            label: a.position,
            color: '#94a3b8',
          };
          map[a.position] = { x: a.start_x, y: a.start_y, posConfig };
        }
      });
      // If we got positions from assignments, also load any config positions not in assignments
      if (Object.keys(map).length > 0) return map;
    }
    // New play: load formation defaults
    return buildPositionsFromFormation('spread', formatId, configPositions);
  });

  // Route state: { [positionId]: { movementType, routePath, assignmentText, segments } }
  const [routes, setRoutes] = useState(() => {
    if (initialAssignments.length > 0) {
      const map = {};
      initialAssignments.forEach((a) => {
        let routePath = null;
        if (a.route_path) {
          try {
            routePath = typeof a.route_path === 'string'
              ? JSON.parse(a.route_path)
              : a.route_path;
          } catch { routePath = null; }
        }
        let segments = null;
        if (a.route_segments) {
          try {
            const raw = typeof a.route_segments === 'string'
              ? JSON.parse(a.route_segments)
              : a.route_segments;
            // Handle both wrapped { segments: [...] } and unwrapped [...] formats
            segments = raw?.segments || raw;
          } catch { segments = null; }
        }
        map[a.position] = {
          movementType: a.movement_type || a.route || '',
          routePath,
          assignmentText: a.assignment_text || '',
          segments,
        };
      });
      return map;
    }
    return {};
  });

  // Custom positions (not from config)
  const [customPositions, setCustomPositions] = useState(() => {
    if (initialPlay?.custom_positions) {
      try {
        return typeof initialPlay.custom_positions === 'string'
          ? JSON.parse(initialPlay.custom_positions)
          : initialPlay.custom_positions;
      } catch { return []; }
    }
    return [];
  });

  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [newPosLabel, setNewPosLabel] = useState('');
  const [newPosShort, setNewPosShort] = useState('');
  const [newPosColor, setNewPosColor] = useState(CUSTOM_POSITION_COLORS[0]);
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
  const [formationChangeConfirm, setFormationChangeConfirm] = useState(null); // pending formation ID

  // ——— Derived ———
  const allPositionConfigs = useMemo(() => {
    const map = {};
    configPositions.forEach((p) => { map[p.id] = p; });
    customPositions.forEach((p) => { map[p.id] = p; });
    return map;
  }, [configPositions, customPositions]);

  // ——— Handlers ———
  const applyFormationChange = useCallback(
    (fId) => {
      setFormation(fId);
      setPositions(
        buildPositionsFromFormation(fId, formatId, configPositions)
      );
      setRoutes({});
      setSelectedPosition(null);
      setIsDrawingRoute(false);
      setFormationChangeConfirm(null);
    },
    [formatId, configPositions]
  );

  const handleFormationChange = useCallback(
    (fId) => {
      if (Object.keys(positions).length > 0 && fId !== formation) {
        const hasRoutes = Object.values(routes).some(
          (r) => r.movementType || (r.routePath && r.routePath.length > 0)
        );
        if (hasRoutes) {
          setFormationChangeConfirm(fId);
          return;
        }
      }
      applyFormationChange(fId);
    },
    [positions, routes, formation, applyFormationChange]
  );

  const handleDragEnd = useCallback((posId, newCoords) => {
    setPositions((prev) => ({
      ...prev,
      [posId]: { ...prev[posId], x: newCoords.x, y: newCoords.y },
    }));
    // Rebuild route from new position
    setRoutes((prev) => {
      const existing = prev[posId];
      if (!existing?.routePath || existing.routePath.length === 0) return prev;

      // If segments exist, regenerate entire chained path from new start
      if (existing.segments && existing.segments.length > 0) {
        const fieldSide = FLAG_FOOTBALL.getFieldSide(newCoords.x);
        const newPath = buildChainedRoutePath(existing.segments, newCoords.x, newCoords.y, fieldSide);
        return { ...prev, [posId]: { ...existing, routePath: newPath.length >= 2 ? newPath : null } };
      }

      // Legacy: just update first point
      const updatedPath = [...existing.routePath];
      updatedPath[0] = { x: newCoords.x, y: newCoords.y };
      return { ...prev, [posId]: { ...existing, routePath: updatedPath } };
    });
  }, []);

  const handlePositionTap = useCallback((posId) => {
    if (isDrawingRoute) return; // don't switch during draw
    setSelectedPosition((prev) => (prev === posId ? null : posId));
    setRoutePanelOpen(true);
  }, [isDrawingRoute]);

  const handleSelectPresetRoute = useCallback(
    (routeId) => {
      if (!selectedPosition || !positions[selectedPosition]) return;
      const pos = positions[selectedPosition];
      const templateFn = FLAG_FOOTBALL.routeTemplates[routeId];
      if (!templateFn) return;

      const fieldSide = FLAG_FOOTBALL.getFieldSide(pos.x);
      const routePath = templateFn({
        startX: pos.x,
        startY: pos.y,
        fieldSide,
      });

      // Store single-segment metadata for future chaining
      const yards = ROUTE_SEGMENT_DEFAULTS[routeId] || 10;
      const segments = [{ routeId, yards }];

      setRoutes((prev) => ({
        ...prev,
        [selectedPosition]: {
          ...prev[selectedPosition],
          movementType: routeId,
          routePath: routePath.length >= 2 ? routePath : null,
          segments,
        },
      }));
      setIsDrawingRoute(false);
    },
    [selectedPosition, positions]
  );

  const handleSegmentsChange = useCallback(
    (segments) => {
      if (!selectedPosition || !positions[selectedPosition]) return;
      const pos = positions[selectedPosition];

      if (!segments || segments.length === 0) {
        // Cleared — remove route
        setRoutes((prev) => ({
          ...prev,
          [selectedPosition]: {
            ...prev[selectedPosition],
            movementType: '',
            routePath: null,
            segments: null,
          },
        }));
        return;
      }

      const fieldSide = FLAG_FOOTBALL.getFieldSide(pos.x);
      const routePath = buildChainedRoutePath(segments, pos.x, pos.y, fieldSide);
      const movementType = segments.map((s) => s.routeId).join('-');

      setRoutes((prev) => ({
        ...prev,
        [selectedPosition]: {
          ...prev[selectedPosition],
          movementType,
          routePath: routePath.length >= 2 ? routePath : null,
          segments,
        },
      }));
      setIsDrawingRoute(false);
    },
    [selectedPosition, positions]
  );

  const handleDrawCustom = useCallback(() => {
    if (!selectedPosition) return;
    setIsDrawingRoute(true);
  }, [selectedPosition]);

  const handleRouteDrawn = useCallback(
    (path) => {
      if (!selectedPosition) return;
      setRoutes((prev) => ({
        ...prev,
        [selectedPosition]: {
          ...prev[selectedPosition],
          movementType: 'custom',
          routePath: path,
          segments: null, // custom draw overrides segments
        },
      }));
      setIsDrawingRoute(false);
    },
    [selectedPosition]
  );

  const handleClearRoute = useCallback(() => {
    if (!selectedPosition) return;
    setRoutes((prev) => ({
      ...prev,
      [selectedPosition]: {
        ...prev[selectedPosition],
        movementType: '',
        routePath: null,
        segments: null,
      },
    }));
  }, [selectedPosition]);

  const handleAssignmentTextChange = useCallback(
    (text) => {
      if (!selectedPosition) return;
      setRoutes((prev) => ({
        ...prev,
        [selectedPosition]: {
          ...prev[selectedPosition],
          assignmentText: text,
        },
      }));
    },
    [selectedPosition]
  );

  const handleAddCustomPosition = useCallback(() => {
    if (!newPosShort.trim()) {
      toast.error('Enter a short label (e.g. WR)');
      return;
    }
    const id = `custom_${Date.now()}`;
    const newPos = {
      id,
      label: newPosLabel.trim() || newPosShort.trim(),
      shortLabel: newPosShort.trim().slice(0, 3).toUpperCase(),
      color: newPosColor,
    };
    setCustomPositions((prev) => [...prev, newPos]);
    setPositions((prev) => ({
      ...prev,
      [id]: { x: 50, y: 50, posConfig: newPos },
    }));
    setNewPosLabel('');
    setNewPosShort('');
    setNewPosColor(CUSTOM_POSITION_COLORS[0]);
    setAddPositionOpen(false);
  }, [newPosLabel, newPosShort, newPosColor]);

  const toggleTag = useCallback((value) => {
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }, []);

  // ——— Save ———
  const handleSave = useCallback(async () => {
    if (!playName.trim()) {
      toast.error('Enter a play name');
      return;
    }
    if (Object.keys(positions).length === 0) {
      toast.error('Add at least one position');
      return;
    }

    setSaving(true);
    try {
      const formationLabel =
        offenseFormations[formation]?.label || formation;

      const playPayload = {
        team_id: team.id,
        name: playName.trim(),
        side: 'offense',
        formation: formationLabel,
        use_renderer: true,
        is_mirrorable: isMirrorable,
        game_day: gameDayFlag,
        tags: tags.join(','),
        coach_notes: coachNotes.trim() || null,
        custom_positions:
          customPositions.length > 0 ? customPositions : null,
        status: 'active',
      };

      let playId;

      const invoke = (args) => base44.functions.invoke('manageTeamPlay', { ...args, team_id: team.id });

      if (initialPlay?.id) {
        // Update existing play
        await invoke({ action: 'update', entity_type: 'play', entity_id: initialPlay.id, data: playPayload });
        playId = initialPlay.id;

        // Smart assignment update: update existing, create new, delete removed
        const existingAssignments = await base44.entities.PlayAssignment.filter({
          play_id: playId,
        });
        const existingList = Array.isArray(existingAssignments)
          ? existingAssignments
          : [];

        const existingByPosition = {};
        existingList.forEach((a) => {
          existingByPosition[a.position] = a;
        });

        const currentPositionIds = new Set(Object.keys(positions));

        // Update or create assignments for current positions
        for (const posId of currentPositionIds) {
          const pos = positions[posId];
          const route = routes[posId] || {};
          const assignmentData = {
            play_id: playId,
            position: posId,
            start_x: Math.round(pos.x * 10) / 10,
            start_y: Math.round(pos.y * 10) / 10,
            movement_type: route.movementType || '',
            route_path: route.routePath || null,
            assignment_text: route.assignmentText || '',
            route_segments: route.segments ? { segments: route.segments } : null,
          };

          if (existingByPosition[posId]) {
            // Update existing
            await invoke({ action: 'update', entity_type: 'play_assignment', entity_id: existingByPosition[posId].id, data: assignmentData });
          } else {
            // Create new
            await invoke({ action: 'create', entity_type: 'play_assignment', data: assignmentData });
          }
        }

        // Delete assignments for removed positions
        for (const posId of Object.keys(existingByPosition)) {
          if (!currentPositionIds.has(posId)) {
            await invoke({ action: 'delete', entity_type: 'play_assignment', entity_id: existingByPosition[posId].id });
          }
        }
      } else {
        // Create new play
        playPayload.created_by = currentUserId;
        const created = await invoke({ action: 'create', entity_type: 'play', data: playPayload });
        playId = created.id;

        // Create all assignments
        for (const posId of Object.keys(positions)) {
          const pos = positions[posId];
          const route = routes[posId] || {};
          await invoke({
            action: 'create',
            entity_type: 'play_assignment',
            data: {
              play_id: playId,
              position: posId,
              start_x: Math.round(pos.x * 10) / 10,
              start_y: Math.round(pos.y * 10) / 10,
              movement_type: route.movementType || '',
              route_path: route.routePath || null,
              assignment_text: route.assignmentText || '',
              route_segments: route.segments ? { segments: route.segments } : null,
            },
          });
        }
      }

      toast.success(initialPlay ? 'Play updated' : 'Play created');
      onSave?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to save play');
    } finally {
      setSaving(false);
    }
  }, [
    playName, positions, routes, formation, isMirrorable, gameDayFlag,
    coachNotes, tags, customPositions, team, initialPlay, currentUserId, onSave,
  ]);

  // ——— Render ———
  const selectedPos = selectedPosition ? positions[selectedPosition] : null;
  const selectedConfig = selectedPosition
    ? allPositionConfigs[selectedPosition] || selectedPos?.posConfig
    : null;

  return (
    <div className="space-y-4 pb-4">
      {/* Play name */}
      <div>
        <Input
          value={playName}
          onChange={(e) => setPlayName(e.target.value)}
          className="w-full bg-slate-800 border-slate-700 text-white text-lg font-semibold placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
          placeholder="Play name *"
        />
      </div>

      {/* Formation picker */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
          Formation
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.entries(offenseFormations).map(([fId, f]) => (
            <button
              key={fId}
              type="button"
              onClick={() => handleFormationChange(fId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                formation === fId
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Field */}
      <div
        className="relative rounded-xl overflow-hidden border border-slate-700 min-h-[250px] md:min-h-[350px]"
        style={{ touchAction: isDrawingRoute ? 'none' : 'auto' }}
      >
        <FlagFootballField viewBox={viewBox} showScrimmage scrimmageY={55}>
          {/* Route paths */}
          {Object.entries(routes).map(([posId, route]) => {
            if (!route.routePath || route.routePath.length < 2) return null;
            const posConfig =
              allPositionConfigs[posId] || positions[posId]?.posConfig;
            return (
              <RoutePath
                key={`route-${posId}`}
                routePath={route.routePath}
                color={posConfig?.color || '#ffffff'}
                isHighlighted={selectedPosition === posId}
                viewBox={viewBox}
              />
            );
          })}

          {/* Position markers */}
          {Object.entries(positions).map(([posId, pos]) => {
            const posConfig =
              allPositionConfigs[posId] || pos.posConfig;
            return (
              <PositionMarker
                key={`pos-${posId}`}
                position={posConfig}
                x={pos.x}
                y={pos.y}
                isSelected={selectedPosition === posId}
                isDraggable={!isDrawingRoute}
                onClick={handlePositionTap}
                onDragEnd={handleDragEnd}
                viewBox={viewBox}
              />
            );
          })}

          {/* Freehand drawing overlay */}
          {isDrawingRoute && selectedPos && (
            <RouteDrawCanvas
              active
              startPoint={{ x: selectedPos.x, y: selectedPos.y }}
              onRouteDrawn={handleRouteDrawn}
              onCancel={() => setIsDrawingRoute(false)}
              viewBox={viewBox}
            />
          )}
        </FlagFootballField>

        {/* Drawing mode indicator */}
        {isDrawingRoute && (
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className="bg-amber-500/90 text-black text-xs font-semibold px-3 py-1.5 rounded-lg">
              Draw route on the field
            </span>
            <button
              type="button"
              onClick={() => setIsDrawingRoute(false)}
              className="bg-slate-800/90 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Add custom position */}
      <div>
        <button
          type="button"
          onClick={() => setAddPositionOpen(!addPositionOpen)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Custom Position
          {addPositionOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {addPositionOpen && (
          <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Label
                </label>
                <Input
                  value={newPosLabel}
                  onChange={(e) => setNewPosLabel(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white text-sm min-h-[40px]"
                  placeholder="e.g. Slot"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Short (2-3 chars) *
                </label>
                <Input
                  value={newPosShort}
                  onChange={(e) => setNewPosShort(e.target.value.slice(0, 3))}
                  className="bg-slate-800 border-slate-700 text-white text-sm min-h-[40px]"
                  placeholder="e.g. SL"
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Color</label>
              <div className="flex gap-2">
                {CUSTOM_POSITION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewPosColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      newPosColor === c
                        ? 'border-amber-500 scale-110'
                        : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddCustomPosition}
              className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm min-h-[40px]"
              size="sm"
            >
              Add Position
            </Button>
          </div>
        )}
      </div>

      {/* Route selector panel (when a position is selected) */}
      {selectedPosition && selectedConfig && (
        <div>
          <button
            type="button"
            onClick={() => setRoutePanelOpen(!routePanelOpen)}
            className="flex items-center gap-2 mb-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Route Assignment
            {routePanelOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {routePanelOpen && (
            <RouteSelector
              position={selectedConfig}
              positionId={selectedPosition}
              currentRoute={routes[selectedPosition] || null}
              onSelectPreset={handleSelectPresetRoute}
              onSegmentsChange={handleSegmentsChange}
              onDrawCustom={handleDrawCustom}
              onClearRoute={handleClearRoute}
              onAssignmentTextChange={handleAssignmentTextChange}
              assignmentText={routes[selectedPosition]?.assignmentText || ''}
              onClose={() => setSelectedPosition(null)}
            />
          )}
        </div>
      )}

      {/* Toggles row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => setIsMirrorable(!isMirrorable)}
          className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
        >
          <span className="text-slate-300 text-sm">Mirror</span>
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isMirrorable ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${
                isMirrorable ? 'left-5' : 'left-0.5'
              }`}
            />
          </div>
        </div>
        <div
          onClick={() => setGameDayFlag(!gameDayFlag)}
          className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
        >
          <span className="text-slate-300 text-sm">Game Day</span>
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${
              gameDayFlag ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${
                gameDayFlag ? 'left-5' : 'left-0.5'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
          Tags
        </p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleTag(t.value)}
              className={`text-xs px-2.5 py-1.5 rounded transition-colors ${
                tags.includes(t.value)
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
          Coach Notes
        </p>
        <textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Strategy notes — only visible to coaches"
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none min-h-[60px]"
        />
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialPlay ? (
            'Update Play'
          ) : (
            'Save Play'
          )}
        </Button>
      </div>

      {/* Formation change confirmation */}
      <ConfirmDialog
        open={!!formationChangeConfirm}
        onOpenChange={(open) => { if (!open) setFormationChangeConfirm(null); }}
        title="Change formation?"
        description={`Reset positions to ${offenseFormations[formationChangeConfirm]?.label || formationChangeConfirm} defaults? Route assignments will be cleared.`}
        confirmLabel="Reset"
        destructive
        onConfirm={() => applyFormationChange(formationChangeConfirm)}
      />
    </div>
  );
}

// ——— Helper ———
function buildPositionsFromFormation(formationId, formatId, configPositions) {
  const defaults = getFormationDefaults(formationId, formatId);
  const map = {};
  configPositions.forEach((p) => {
    if (defaults[p.id]) {
      map[p.id] = { x: defaults[p.id].x, y: defaults[p.id].y, posConfig: p };
    }
  });
  return map;
}
