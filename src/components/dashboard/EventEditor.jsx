import React, { useState, useEffect, useRef } from "react";
import { format, addMinutes, parseISO, formatDistanceToNow } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useOrganization } from "@/hooks/useOrganization";
import { LockedFeature } from "@/components/ui/LockedFeature";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  MapPin,
  DollarSign,
  Upload,
  Trash2,
  Loader2,
  Info,
  AlertCircle,
  Plus,
  Lock,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/useConfig";

export default function EventEditor({
  business,
  existingEvent,
  onSave,
  onCancel,
  instructors = [],
  locations = [],
}) {
  const { tier, canUsePunchPass, canUseMultipleTickets } = useOrganization(business);

  const { data: eventTypes = [] } = useConfig("events", "event_types");
  const { data: networks = [] } = useConfig("platform", "networks");
  const { data: ageGroups = [] } = useConfig("events", "age_groups");
  const { data: durationPresets = [] } = useConfig("events", "duration_presets");
  const { data: accessibilityOptions = [] } = useConfig("events", "accessibility_features");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: null,
    start_time: "10:00",
    duration_minutes: 60,
    location: "",
    image: "",
    pricing_type: "free",
    price: "",
    min_price: "",
    punch_pass_eligible: false,
    punch_cost: 1,
    event_type: "",
    networks: [],
    age_info: "",
    capacity: "",
    accepts_rsvps: false,
    additional_notes: "",
    accessibility_features: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("weekly");
  const [selectedDays, setSelectedDays] = useState([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
  const [recurrenceEndDateOpen, setRecurrenceEndDateOpen] = useState(false);

  const [endTimeMode, setEndTimeMode] = useState("duration");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState(null);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimer = useRef(null);
  const formDataRef = useRef(formData);
  const hasRestoredDraft = useRef(false);
  formDataRef.current = formData;

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  /* ALL useEffect HOOKS IN THIS FILE (dependency arrays):
   * 1. Prefill existingEvent → [existingEvent?.id] — calls setFormData, setEndTimeMode, setEndTime, setEndDate
   * 2. Draft restore → [] — calls setFormData (once, guarded by hasRestoredDraft)
   * 3. Auto-save → [formData.title, existingEvent?.id] — uses formDataRef.current, calls setLastSaved only
   * NONE have formData or formData.accessibility_features in deps (would cause loop).
   */

  // Prefill from backend field names: date, punch_pass_accepted, network, thumbnail_url
  useEffect(() => {
    if (existingEvent) {
      const start = existingEvent.date
        ? parseISO(existingEvent.date)
        : existingEvent.start_date
        ? parseISO(existingEvent.start_date)
        : null;
      const end = existingEvent.end_date
        ? parseISO(existingEvent.end_date)
        : null;
      const duration =
        start && end
          ? Math.round((end - start) / 60000)
          : existingEvent.duration_minutes || 60;
      setFormData({
        title: existingEvent.title || "",
        description: existingEvent.description || "",
        start_date: start,
        start_time: start ? format(start, "HH:mm") : "10:00",
        duration_minutes: duration,
        location: existingEvent.location || "",
        image:
          existingEvent.thumbnail_url ||
          (Array.isArray(existingEvent.images) ? existingEvent.images[0] : null) ||
          existingEvent.image ||
          "",
        pricing_type:
          existingEvent.pricing_type ||
          (existingEvent.is_free ? "free" : "single_price"),
        price: String(existingEvent.price ?? ""),
        min_price: String(existingEvent.min_price ?? ""),
        punch_pass_eligible:
          existingEvent.punch_pass_accepted ?? existingEvent.punch_pass_eligible ?? false,
        punch_cost: existingEvent.punch_cost ?? 1,
        event_type:
          existingEvent.event_type ||
          (Array.isArray(existingEvent.event_types) ? existingEvent.event_types[0] : "") ||
          "",
        networks: (() => {
          const n = existingEvent.network;
          const arr = Array.isArray(existingEvent.networks) ? existingEvent.networks : n ? [n] : [];
          return arr.map((v) => {
            const found = networks.find((net) => net.value === v || net.label === v);
            return found ? found.value : v;
          });
        })(),
        age_info: (() => {
          const a = existingEvent.age_info;
          if (!a) return "";
          const found = ageGroups.find((ag) => ag.value === a || ag.label === a);
          return found ? found.value : a;
        })(),
        capacity: existingEvent.capacity ? String(existingEvent.capacity) : "",
        accepts_rsvps: !!existingEvent.accepts_rsvps,
        additional_notes: existingEvent.additional_notes || "",
        accessibility_features: Array.isArray(existingEvent.accessibility_features) ? existingEvent.accessibility_features : [],
        ticket_types: Array.isArray(existingEvent.ticket_types) && existingEvent.ticket_types.length > 0
          ? existingEvent.ticket_types.map((t) => ({
              name: t.name ?? "",
              price: t.price != null ? String(t.price) : "",
              quantity_limit: t.quantity_limit != null ? String(t.quantity_limit) : "",
            }))
          : [{ name: "", price: "", quantity_limit: "" }],
      });
      const presetMinutes = durationPresets
        .filter((d) => d.active !== false)
        .map((d) => d.minutes ?? d.value);
      const matchesPreset = presetMinutes.includes(duration);
      if (matchesPreset) {
        setEndTimeMode("duration");
        setEndTime("");
        setEndDate(null);
      } else {
        setEndTimeMode("end_time");
        setEndTime(end ? format(end, "HH:mm") : "11:00");
        const startDay = start ? format(start, "yyyy-MM-dd") : "";
        const endDay = end ? format(end, "yyyy-MM-dd") : "";
        setEndDate(start && end && endDay !== startDay ? end : null);
      }
    }
  // Only re-run when editing a different event (existingEvent?.id). Do NOT depend on
  // networks/ageGroups/durationPresets — they get new refs each render and cause infinite loop.
  }, [existingEvent?.id]);

  const validate = () => {
    const e = {};
    if (!formData.title?.trim()) e.title = "Title is required";
    if (!formData.start_date) e.start_date = "Start date is required";
    if (formData.is_virtual) {
      if (!formData.virtual_url?.trim()) e.virtual_url = "Meeting link is required";
    } else if (!formData.is_location_tbd && !formData.location?.trim()) {
      e.location = "Location is required";
    }
    if (!formData.description?.trim()) e.description = "Description is required";
    if (!formData.event_type) e.event_type = "Select an event type";
    if (
      formData.pricing_type === "single_price" &&
      (!formData.price || parseFloat(formData.price) <= 0)
    )
      e.price = "Enter a valid price";
    if (
      formData.pricing_type === "pay_what_you_wish" &&
      formData.min_price &&
      parseFloat(formData.min_price) < 0
    )
      e.min_price = "Min price must be 0 or more";
    if (formData.punch_pass_eligible && formData.pricing_type === "free") {
      e.pricing_type = "Punch Pass events cannot be free";
    }
    if (formData.pricing_type === "multiple_tickets") {
      const validTickets = formData.ticket_types?.filter((t) => t.name?.trim() && t.price !== "" && parseFloat(t.price) >= 0);
      if (!validTickets?.length) e.ticket_types = "Add at least one ticket type with name and price";
    }
    if (endTimeMode === "end_time") {
      if (!endTime?.trim()) e.end_time = "End time is required";
      if (endDate && formData.start_date) {
        const startDay = new Date(formData.start_date);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(endDate);
        endDay.setHours(0, 0, 0, 0);
        if (endDay < startDay) e.end_date = "End date must be on or after start date";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url || result?.url;
      if (url) setFormData((prev) => ({ ...prev, image: url }));
      else toast.error("Upload failed");
    } catch (err) {
      toast.error("Failed to upload image");
    }
  };

  const handleSubmit = async (e, { isDraft = false } = {}) => {
    e?.preventDefault?.();
    if (!validate()) {
      toast.error("Please fix the errors before saving");
      return;
    }
    setIsSubmitting(true);

    const start = new Date(formData.start_date);
    const [h, m] = formData.start_time.split(":").map(Number);
    start.setHours(h, m, 0, 0);

    let end;
    let durationMinutes;
    if (endTimeMode === "end_time" && endTime) {
      const endDateToUse = endDate || formData.start_date;
      end = new Date(endDateToUse);
      const [eh, em] = endTime.split(":").map(Number);
      end.setHours(eh, em, 0, 0);
      durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    } else {
      end = addMinutes(start, formData.duration_minutes);
      durationMinutes = formData.duration_minutes;
    }

    // Step 3: map to backend field names (date, punch_pass_accepted, network, thumbnail_url)
    const eventData = {
      business_id: business.id,
      title: formData.title.trim(),
      description: formData.description.trim(),

      // Date fields
      date: start.toISOString(), // NOT start_date
      end_date: end.toISOString(),
      duration_minutes: durationMinutes,

      // Location & virtual
      location: formData.is_virtual ? null : (formData.location.trim() || null),
      is_virtual: formData.is_virtual,
      virtual_url: formData.is_virtual ? formData.virtual_url.trim() || null : null,
      virtual_platform: formData.is_virtual ? formData.virtual_platform || null : null,
      is_location_tbd: formData.is_location_tbd,

      // Image
      thumbnail_url: formData.image || null, // NOT images array

      // Pricing
      pricing_type: formData.pricing_type,
      price: parseFloat(formData.price) || 0,
      is_free: formData.pricing_type === "free",
      is_pay_what_you_wish: formData.pricing_type === "pay_what_you_wish",
      min_price: parseFloat(formData.min_price) || 0,
      ticket_types:
        formData.pricing_type === "multiple_tickets"
          ? formData.ticket_types
              .filter((t) => t.name?.trim() && t.price !== "")
              .map((t) => ({
                name: t.name.trim(),
                price: parseFloat(t.price) || 0,
                quantity_limit: t.quantity_limit ? parseInt(t.quantity_limit, 10) : null,
              }))
          : null,

      // Punch Pass
      punch_pass_accepted: canUsePunchPass ? formData.punch_pass_eligible : false, // NOT punch_pass_eligible
      punch_cost: formData.punch_cost ?? 1,

      // Categorization
      event_type: formData.event_type || null,
      network: formData.networks?.[0] ?? null, // Single value, NOT array
      age_info: formData.age_info?.trim() || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,

      // Status
      status: isDraft ? "draft" : tier === "basic" ? "pending_review" : "published",
      is_active: true,

      // Recurrence (MVP: save settings only; instances generated later)
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      recurrence_days:
        isRecurring &&
        (recurrencePattern === "weekly" || recurrencePattern === "biweekly")
          ? selectedDays
          : null,
      recurrence_end_date:
        isRecurring && recurrenceEndDate
          ? recurrenceEndDate.toISOString()
          : null,

      accepts_rsvps: formData.accepts_rsvps,
      additional_notes: formData.additional_notes?.trim() || null,
    };

    try {
      await Promise.resolve(onSave(eventData));
      if (typeof window !== "undefined") localStorage.removeItem("event_draft");
      toast.success(
        isDraft
          ? "Draft saved!"
          : eventData.status === "pending_review"
          ? "Event submitted for review"
          : "Event saved"
      );
    } catch (err) {
      toast.error("Failed to save event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNetwork = (name) => {
    setFormData((prev) => ({
      ...prev,
      networks: prev.networks.includes(name)
        ? prev.networks.filter((n) => n !== name)
        : [...prev.networks, name],
    }));
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: [...(prev.ticket_types || []), { name: "", price: "", quantity_limit: "" }],
    }));
  };

  const updateTicketType = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      ticket_types: (prev.ticket_types || []).map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  const removeTicketType = (index) => {
    setFormData((prev) => {
      const types = prev.ticket_types || [];
      if (types.length <= 1) return prev;
      return {
        ...prev,
        ticket_types: types.filter((_, i) => i !== index),
      };
    });
  };

  const toggleAccessibility = (feature) => {
    setFormData((prev) => ({
      ...prev,
      accessibility_features: prev.accessibility_features.includes(feature)
        ? prev.accessibility_features.filter((f) => f !== feature)
        : [...prev.accessibility_features, feature],
    }));
  };

  const DRAFT_KEY = "event_draft";

  // Draft restore: run once on mount when creating a new event. Empty deps + guard prevent loop.
  useEffect(() => {
    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;
    if (existingEvent) return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.title) {
          setFormData((prev) => ({ ...prev, ...draft }));
          toast.info("Draft restored from last session");
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (existingEvent || !formData.title?.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formDataRef.current));
        setLastSaved(new Date());
      } catch (_) {}
      autoSaveTimer.current = null;
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formData.title, existingEvent?.id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Basic info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-500" />
            Basic Information
          </h3>
          <div data-error="title">
            <Label className="text-slate-300">Event Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="e.g., Summer Art Workshop"
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>
          <div data-error="description">
            <Label className="text-slate-300">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="bg-slate-900 border-slate-700 text-white mt-1 min-h-[100px]"
              placeholder="Describe your event..."
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>
        </div>

        {/* Date & time */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Date & Time</h3>
          <div data-error="start_date">
            <Label className="text-slate-300">Start Date *</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left bg-slate-900 border-slate-700 text-slate-100 mt-1"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date
                    ? format(formData.start_date, "PPP")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => {
                    setFormData((prev) => ({ ...prev, start_date: date }));
                    setStartDateOpen(false);
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                />
              </PopoverContent>
            </Popover>
            {errors.start_date && (
              <p className="text-red-400 text-sm mt-1">{errors.start_date}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, start_time: e.target.value }))
                }
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">End</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEndTimeMode("duration")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    endTimeMode === "duration"
                      ? "bg-amber-500 text-black"
                      : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50"
                  )}
                >
                  Duration
                </button>
                <button
                  type="button"
                  onClick={() => setEndTimeMode("end_time")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    endTimeMode === "end_time"
                      ? "bg-amber-500 text-black"
                      : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50"
                  )}
                >
                  End Time
                </button>
              </div>
            </div>
          </div>

          {endTimeMode === "duration" ? (
            <div>
              <Label className="text-slate-300">Duration</Label>
              <Select
                value={String(formData.duration_minutes)}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration_minutes: parseInt(v, 10),
                  }))
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {durationPresets
                    .filter((d) => d.active !== false)
                    .map((duration) => (
                      <SelectItem
                        key={duration.value ?? duration.minutes}
                        value={String(duration.minutes ?? duration.value)}
                        className="text-slate-300"
                      >
                        {duration.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div data-error="end_time">
                <Label className="text-slate-300">End Time *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
                {errors.end_time && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.end_time}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-slate-300">Different end date (optional)</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left bg-slate-900 border-slate-700 text-slate-100 mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Same day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setEndDateOpen(false);
                      }}
                      disabled={(date) => {
                        if (!formData.start_date) return true;
                        const startDay = new Date(formData.start_date);
                        startDay.setHours(0, 0, 0, 0);
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return d < startDay;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate(null)}
                    className="text-slate-400 text-sm mt-1 hover:text-white"
                  >
                    Clear (same day)
                  </button>
                )}
                {errors.end_date && (
                  <p className="text-red-400 text-sm mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recurring Event Section */}
        <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">This event repeats</p>
              <p className="text-slate-400 text-sm">
                Create multiple event instances on a schedule
              </p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {isRecurring && (
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div>
                <Label className="text-slate-300">Pattern</Label>
                <Select
                  value={recurrencePattern}
                  onValueChange={setRecurrencePattern}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="daily" className="text-slate-300">
                      Daily
                    </SelectItem>
                    <SelectItem value="weekly" className="text-slate-300">
                      Weekly
                    </SelectItem>
                    <SelectItem value="biweekly" className="text-slate-300">
                      Every 2 weeks
                    </SelectItem>
                    <SelectItem value="monthly" className="text-slate-300">
                      Monthly
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(recurrencePattern === "weekly" ||
                recurrencePattern === "biweekly") && (
                <div>
                  <Label className="text-slate-300">Repeats on</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={cn(
                            "px-4 py-2 rounded-lg border transition-colors",
                            selectedDays.includes(day)
                              ? "bg-amber-500 border-amber-500 text-black"
                              : "bg-slate-800 border-slate-700 text-white hover:border-slate-600"
                          )}
                        >
                          {day}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-slate-300">Ends on (Optional)</Label>
                <Popover open={recurrenceEndDateOpen} onOpenChange={setRecurrenceEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start mt-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate
                        ? format(recurrenceEndDate, "PPP")
                        : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-slate-800 border-slate-700 p-0 w-auto">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={(date) => {
                        setRecurrenceEndDate(date);
                        setRecurrenceEndDateOpen(false);
                      }}
                      disabled={(date) => {
                        const today = new Date(new Date().setHours(0, 0, 0, 0));
                        if (date < today) return true;
                        if (formData.start_date && date <= formData.start_date) return true;
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {recurrenceEndDate && (
                  <button
                    type="button"
                    onClick={() => setRecurrenceEndDate(null)}
                    className="text-slate-400 text-sm mt-1 hover:text-white"
                  >
                    Clear end date
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location / Virtual / TBD */}
        <div className="space-y-3">
          <Label className="text-slate-300">Location</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  is_virtual: !prev.is_virtual,
                  is_location_tbd: prev.is_virtual ? prev.is_location_tbd : false,
                }))
              }
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                formData.is_virtual
                  ? "bg-amber-500 text-black"
                  : "bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500/50"
              )}
            >
              <Video className="h-4 w-4" />
              Virtual/Online Event
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  is_location_tbd: !prev.is_location_tbd,
                  is_virtual: prev.is_location_tbd ? prev.is_virtual : false,
                }))
              }
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                formData.is_location_tbd
                  ? "bg-amber-500 text-black"
                  : "bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500/50"
              )}
            >
              Location TBD
            </button>
          </div>

          {formData.is_virtual ? (
            <div className="space-y-3 pt-2">
              <div data-error="virtual_url">
                <Label className="text-slate-300">Virtual Meeting Link *</Label>
                <Input
                  type="url"
                  value={formData.virtual_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, virtual_url: e.target.value }))
                  }
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="https://zoom.us/j/..."
                />
                {errors.virtual_url && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.virtual_url}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-slate-300">Platform</Label>
                <Select
                  value={formData.virtual_platform || "zoom"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, virtual_platform: v }))
                  }
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="zoom" className="text-slate-300">Zoom</SelectItem>
                    <SelectItem value="google_meet" className="text-slate-300">Google Meet</SelectItem>
                    <SelectItem value="microsoft_teams" className="text-slate-300">Microsoft Teams</SelectItem>
                    <SelectItem value="other" className="text-slate-300">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div data-error="location" className="pt-2">
              <Label className="text-slate-300">
                {formData.is_location_tbd ? "Location (optional)" : "Location *"}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-slate-400" />
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder={
                    formData.is_location_tbd
                      ? "Location to be announced"
                      : "e.g., 123 Main St, City"
                  }
                />
              </div>
              {errors.location && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.location}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Image (single) */}
        <div>
          <Label className="text-slate-300">Event Image</Label>
          <div className="flex items-center gap-4 mt-2">
            {formData.image ? (
              <div className="relative group">
                <img
                  src={formData.image}
                  alt=""
                  className="w-32 h-32 object-cover rounded-lg border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, image: "" }))
                  }
                  className="absolute top-1 right-1 p-1 bg-red-600 rounded hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : null}
            <label className="w-32 h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors">
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Pricing
          </h3>
          <div data-error="pricing_type">
            <Label className="text-slate-300">Pricing Type</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["free", "single_price", "multiple_tickets", "pay_what_you_wish"].map((type) => {
                const isLocked = type === "multiple_tickets" && !canUseMultipleTickets;
                const isDisabled = isLocked || (type === "free" && formData.punch_pass_eligible);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      !isDisabled &&
                      setFormData((prev) => ({
                        ...prev,
                        pricing_type: type,
                        price: type === "free" ? "" : prev.price,
                        min_price: type === "pay_what_you_wish" ? prev.min_price : "",
                      }))
                    }
                    disabled={isDisabled}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1",
                      formData.pricing_type === type
                        ? "bg-amber-500 text-black"
                        : isDisabled
                        ? "bg-slate-800/50 text-slate-500 border border-slate-700 cursor-not-allowed"
                        : "bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500/50"
                    )}
                  >
                    {type === "free" && "Free"}
                    {type === "single_price" && "Single Price"}
                    {type === "multiple_tickets" && (
                      <>
                        Multiple Tickets
                        {isLocked && <Lock className="h-3 w-3" />}
                      </>
                    )}
                    {type === "pay_what_you_wish" && "Pay What You Wish"}
                  </button>
                );
              })}
            </div>
            {!canUseMultipleTickets && (
              <p className="text-xs text-slate-400 mt-1">
                Multiple ticket types require Standard tier or higher.
              </p>
            )}
            {errors.pricing_type && (
              <p className="text-red-400 text-sm mt-1">{errors.pricing_type}</p>
            )}
          </div>
          {formData.pricing_type === "single_price" && (
            <div data-error="price">
              <Label className="text-slate-300">Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                className="bg-slate-900 border-slate-700 text-white mt-1 w-32"
              />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
              )}
            </div>
          )}
          {formData.pricing_type === "multiple_tickets" && (
            <div className="space-y-3" data-error="ticket_types">
              {(formData.ticket_types || []).map((ticket, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Tier name"
                      value={ticket.name}
                      onChange={(e) => updateTicketType(index, "name", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={ticket.price}
                      onChange={(e) => updateTicketType(index, "price", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Limit (optional)"
                      value={ticket.quantity_limit}
                      onChange={(e) => updateTicketType(index, "quantity_limit", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTicketType(index)}
                    disabled={(formData.ticket_types || []).length <= 1}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={addTicketType}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ticket Type
              </Button>
              {errors.ticket_types && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.ticket_types}
                </p>
              )}
            </div>
          )}
          {formData.pricing_type === "pay_what_you_wish" && (
            <div data-error="min_price">
              <Label className="text-slate-300">Minimum suggested ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.min_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, min_price: e.target.value }))
                }
                className="bg-slate-900 border-slate-700 text-white mt-1 w-32"
                placeholder="0"
              />
              {errors.min_price && (
                <p className="text-red-400 text-sm mt-1">{errors.min_price}</p>
              )}
            </div>
          )}
        </div>

        {/* Punch Pass */}
        <div className="space-y-3">
          <Label className="text-slate-300">Punch Pass</Label>
          {canUsePunchPass ? (
            <div className="space-y-3 p-4 bg-slate-900 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Punch Pass Eligible</span>
                <Switch
                  checked={formData.punch_pass_eligible}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      punch_pass_eligible: checked,
                      pricing_type:
                        checked && prev.pricing_type === "free"
                          ? ""
                          : prev.pricing_type,
                    }))
                  }
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
              {formData.punch_pass_eligible && (
                <div>
                  <Label className="text-slate-300 text-sm">Punch Cost</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((cost) => (
                      <button
                        key={cost}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, punch_cost: cost }))
                        }
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium",
                          formData.punch_cost === cost
                            ? "bg-amber-500 text-black"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        )}
                      >
                        {cost} {cost === 1 ? "punch" : "punches"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <LockedFeature
              requiredTier="standard"
              featureName="Punch Pass"
              className="rounded-xl"
            >
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Punch Pass Eligible</span>
                  <Switch disabled className="opacity-50" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This event accepts Punch Pass payments
                </p>
              </div>
            </LockedFeature>
          )}
        </div>

        {/* Event Type */}
        <div data-error="event_type">
          <Label className="text-slate-300">Event Type *</Label>
          <Select
            value={formData.event_type}
            onValueChange={(v) =>
              setFormData((prev) => ({ ...prev, event_type: v }))
            }
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {eventTypes
                .filter((t) => t.active !== false)
                .map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-slate-300"
                  >
                    {type.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.event_type && (
            <p className="text-red-400 text-sm mt-1">{errors.event_type}</p>
          )}
        </div>

        {/* Networks */}
        <div>
          <Label className="text-slate-300">Networks / Communities (optional)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {networks
              .filter((n) => n.active !== false)
              .map((network) => (
                <button
                  key={network.value}
                  type="button"
                  onClick={() => toggleNetwork(network.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    formData.networks.includes(network.value)
                      ? "bg-amber-500 text-black"
                      : "bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500/50"
                  )}
                >
                  {network.label}
                </button>
              ))}
          </div>
        </div>

        {/* Age / Audience */}
        <div>
          <Label className="text-slate-300">Age / Audience (optional)</Label>
          <Select
            value={formData.age_info || "none"}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                age_info: v === "none" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="none" className="text-slate-300">
                —
              </SelectItem>
              {ageGroups
                .filter((a) => a.active !== false)
                .map((age) => (
                  <SelectItem
                    key={age.value}
                    value={age.value}
                    className="text-slate-300"
                  >
                    {age.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Capacity */}
        <div>
          <Label className="text-slate-300">Capacity (optional)</Label>
          <Input
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, capacity: e.target.value }))
            }
            className="bg-slate-900 border-slate-700 text-white mt-1 w-32"
            placeholder="e.g., 50"
          />
        </div>

        {/* Additional Settings */}
        <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-900/50">
          <h3 className="text-lg font-semibold text-white">Additional Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-slate-300">Accept RSVPs for this event</Label>
              <p className="text-sm text-slate-400 mt-0.5">Allow attendees to RSVP through Local Lane</p>
            </div>
            <Switch
              checked={formData.accepts_rsvps}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, accepts_rsvps: checked }))
              }
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
          <div>
            <Label className="text-slate-300">Additional Notes (Optional)</Label>
            <Textarea
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, additional_notes: e.target.value }))
              }
              className="bg-slate-900 border-slate-700 text-white mt-1 min-h-[80px]"
              placeholder="Parking details, what to bring, etc."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-slate-300">Accessibility (Optional)</Label>
            <div className="space-y-2 mt-2">
              {(accessibilityOptions || [])
                .filter((o) => o.active !== false)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((opt) => (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleAccessibility(opt.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && toggleAccessibility(opt.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      formData.accessibility_features?.includes(opt.value)
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-slate-700 hover:border-amber-500/50 bg-slate-800/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                        formData.accessibility_features?.includes(opt.value)
                          ? "bg-amber-500 border-amber-500"
                          : "border-slate-600 bg-transparent"
                      )}
                    >
                      {formData.accessibility_features?.includes(opt.value) && (
                        <svg className="h-3 w-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-slate-200 text-sm">{opt.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          {lastSaved && (
            <p className="text-xs text-slate-500 text-center">
              Last auto-saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, { isDraft: true })}
              variant="outline"
              className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-amber-500 hover:text-amber-500"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publish Event
            </Button>
          </div>
        </div>
      </form>
  );
}
