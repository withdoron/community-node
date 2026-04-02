import React, { useState, useEffect, useRef } from "react";
import { format, addMinutes, parseISO, formatDistanceToNow } from "date-fns";
import { base44 } from "@/api/base44Client";
import { sanitizeText } from "@/utils/sanitize";
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
  Coins,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/useConfig";
import { useRole } from "@/hooks/useRole";

export default function EventEditor({
  business,
  existingEvent,
  onSave,
  onCancel,
  instructors = [],
  locations = [],
}) {
  const { tier, canUseJoyCoins, canUseMultipleTickets } = useOrganization(business);
  const { isAppAdmin } = useRole();

  const { data: eventTypes = [] } = useConfig("events", "event_types");
  const { data: networksRaw = [] } = useConfig("platform", "networks");
  const allowedNetworks = React.useMemo(() => {
    const active = (networksRaw || []).filter((n) => n.active !== false);
    const businessSlugs = Array.isArray(business?.network_ids) ? business.network_ids : [];
    if (businessSlugs.length === 0) return [];
    return active.filter((n) => {
      const slug = n.value ?? n.slug ?? n.id;
      return businessSlugs.includes(slug);
    });
  }, [networksRaw, business?.network_ids]);
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
    images: [],
    pricing_type: "free",
    price: "",
    min_price: "",
    joy_coin_enabled: false,
    joy_coin_cost: "",
    joy_coin_spots: "",
    joy_coin_unlimited: false,
    max_party_size: "",
    frequency_limit_count: "",
    frequency_limit_period: "",
    refund_policy: "moderate",
    adults_only: false,
    event_types: [],
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
  const hasAutoSelectedSingleNetwork = useRef(false);
  formDataRef.current = formData;

  // When business has exactly one assigned network (new event only), pre-select it
  useEffect(() => {
    if (hasAutoSelectedSingleNetwork.current) return;
    if (existingEvent || allowedNetworks.length !== 1) return;
    const slug = allowedNetworks[0].value ?? allowedNetworks[0].slug ?? allowedNetworks[0].id;
    hasAutoSelectedSingleNetwork.current = true;
    setFormData((prev) => ((prev.networks?.length ?? 0) > 0 ? prev : { ...prev, networks: [slug] }));
  }, [existingEvent, allowedNetworks]);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  /* ALL useEffect HOOKS IN THIS FILE (dependency arrays):
   * 1. Prefill existingEvent → [existingEvent?.id] — calls setFormData, setEndTimeMode, setEndTime, setEndDate
   * 2. Draft restore → [] — calls setFormData (once, guarded by hasRestoredDraft)
   * 3. Auto-save → [formData.title, existingEvent?.id] — uses formDataRef.current, calls setLastSaved only
   * 4. Auto-select single network → [existingEvent, allowedNetworks] — sets networks to [slug] once when allowedNetworks.length === 1
   * NONE have formData or formData.accessibility_features in deps (would cause loop).
   */

  // Prefill from backend field names: date, joy_coin_enabled, network, thumbnail_url
  useEffect(() => {
    if (existingEvent) {
      const toUrl = (v) => (typeof v === "string" && v ? v : v && (v.url || v.src) ? (v.url || v.src) : null);
      const fromEvent = [
        existingEvent.thumbnail_url,
        existingEvent.image,
        existingEvent.hero_image,
        existingEvent.photo,
        ...(Array.isArray(existingEvent.images) ? existingEvent.images : []),
      ].map(toUrl).filter(Boolean);
      const initialImages = [...new Set(fromEvent)];

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
        image: initialImages[0] || "",
        images: initialImages,
        pricing_type:
          existingEvent.pricing_type ||
          (existingEvent.is_free ? "free" : "single_price"),
        price: String(existingEvent.price ?? ""),
        min_price: String(existingEvent.min_price ?? ""),
        event_types: (() => {
          const et = existingEvent.event_type;
          const arr = Array.isArray(existingEvent.event_types) ? existingEvent.event_types : et ? [et] : [];
          return arr;
        })(),
        networks: (() => {
          const n = existingEvent.network;
          const arr = Array.isArray(existingEvent.networks) ? existingEvent.networks : n ? [n] : [];
          return arr.map((v) => {
            const found = networksRaw.find((net) => net.value === v || net.label === v);
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
        accessibility_features: (() => {
          let arr = existingEvent.accessibility_features;
          if (typeof arr === "string") {
            try {
              arr = JSON.parse(arr);
            } catch {
              arr = [];
            }
          }
          arr = Array.isArray(arr) ? arr : [];
          if (arr.length > 0) return arr;
          const fromBooleans = [];
          const boolKeys = ["wheelchair_accessible", "sensory_friendly", "childcare_provided", "asl_interpreter", "free_admission"];
          boolKeys.forEach((k) => {
            if (existingEvent[k]) fromBooleans.push(k);
          });
          return fromBooleans;
        })(),
        ticket_types: Array.isArray(existingEvent.ticket_types) && existingEvent.ticket_types.length > 0
          ? existingEvent.ticket_types.map((t) => ({
              name: t.name ?? "",
              price: t.price != null ? String(t.price) : "",
              quantity_limit: t.quantity_limit != null ? String(t.quantity_limit) : "",
            }))
          : [{ name: "", price: "", quantity_limit: "" }],
        // Joy Coins
        joy_coin_enabled: existingEvent.joy_coin_enabled ?? false,
        joy_coin_cost: existingEvent.joy_coin_cost != null ? String(existingEvent.joy_coin_cost) : "",
        joy_coin_spots: existingEvent.joy_coin_spots != null ? String(existingEvent.joy_coin_spots) : "",
        joy_coin_unlimited: existingEvent.joy_coin_unlimited ?? false,
        max_party_size: existingEvent.max_party_size != null ? String(existingEvent.max_party_size) : "",
        frequency_limit_count: existingEvent.frequency_limit_count != null ? String(existingEvent.frequency_limit_count) : "",
        frequency_limit_period: existingEvent.frequency_limit_period || "",
        refund_policy: existingEvent.refund_policy || "moderate",
        adults_only: existingEvent.adults_only ?? false,
        network_only: existingEvent?.network_only ?? false,
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

      // Restore recurrence state from existing event
      setIsRecurring(!!existingEvent.is_recurring);
      setRecurrencePattern(existingEvent.recurrence_pattern || "weekly");
      setSelectedDays(Array.isArray(existingEvent.recurrence_days) ? existingEvent.recurrence_days : []);
      setRecurrenceEndDate(existingEvent.recurrence_end_date ? parseISO(existingEvent.recurrence_end_date) : null);
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
    if (formData.joy_coin_enabled && formData.pricing_type === "free") {
      e.pricing_type = "Joy Coin events cannot be free";
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
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    if ((formData.images || []).length >= 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url || result?.url;
      if (url) setFormData((prev) => ({ ...prev, images: [...(prev.images || []), url] }));
      else toast.error("Upload failed");
    } catch (err) {
      toast.error("Failed to upload image");
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
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

    // Step 3: map to backend field names (date, joy_coin_enabled, network, thumbnail_url)
    const eventData = {
      ...(existingEvent?.id && { event_id: existingEvent.id }),
      business_id: business.id,
      title: sanitizeText(formData.title.trim()),
      description: sanitizeText(formData.description.trim()),

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

      // Image: preserve existing when editing and user didn't change images
      ...(function () {
        if (formData.images?.length) {
          return { thumbnail_url: formData.images[0], images: formData.images };
        }
        if (!existingEvent) return { thumbnail_url: null, images: [] };
        const toUrl = (v) => (typeof v === "string" && v ? v : v && (v.url || v.src) ? (v.url || v.src) : null);
        const fallback = [
          existingEvent.thumbnail_url,
          existingEvent.image,
          existingEvent.hero_image,
          existingEvent.photo,
          ...(Array.isArray(existingEvent.images) ? existingEvent.images : []),
        ].map(toUrl).filter(Boolean);
        const preserved = [...new Set(fallback)];
        return { thumbnail_url: preserved[0] ?? null, images: preserved };
      })(),

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

      joy_coin_enabled: formData.joy_coin_enabled ?? false,
      joy_coin_cost: formData.joy_coin_enabled && formData.joy_coin_cost !== "" ? parseInt(formData.joy_coin_cost, 10) : null,
      joy_coin_spots: formData.joy_coin_enabled && !formData.joy_coin_unlimited && formData.joy_coin_spots !== "" ? parseInt(formData.joy_coin_spots, 10) : null,
      joy_coin_unlimited: formData.joy_coin_enabled ? formData.joy_coin_unlimited : false,
      max_party_size: formData.joy_coin_enabled && formData.max_party_size !== "" ? parseInt(formData.max_party_size, 10) : null,
      frequency_limit_count: formData.joy_coin_enabled && formData.frequency_limit_count !== "" ? parseInt(formData.frequency_limit_count, 10) : null,
      frequency_limit_period: formData.joy_coin_enabled && formData.frequency_limit_period ? formData.frequency_limit_period : null,
      refund_policy: formData.joy_coin_enabled ? (formData.refund_policy || "moderate") : null,
      adults_only: formData.adults_only ?? false,

      // Categorization
      event_type: formData.event_types?.[0] || null,
      event_types: formData.event_types || [],
      network: formData.networks?.[0] ?? null, // Single value, NOT array
      age_info: formData.age_info?.trim() || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,

      // Status: auto-publish for admin, network-assigned businesses, or standard/partner tier.
      // NOTE: Existing Recess events (or any events stuck in pending_review from network-assigned businesses)
      // must be set to status "published" manually in the Base44 dashboard.
      status: (() => {
        if (isDraft) return "draft";
        const hasNetworkAssignment =
          Array.isArray(business?.network_ids) &&
          business.network_ids.length > 0 &&
          (formData.networks?.length ?? 0) > 0 &&
          formData.networks.some((n) => business.network_ids.includes(n));
        const shouldAutoPublish =
          isAppAdmin ||
          hasNetworkAssignment ||
          tier === "standard" ||
          tier === "partner";
        return shouldAutoPublish ? "published" : "pending_review";
      })(),
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
      additional_notes: sanitizeText(formData.additional_notes?.trim()) || null,

      network_only: !!(formData.networks?.length > 0 && formData.network_only),

      // Accessibility: array for display/filter + booleans for compatibility
      accessibility_features: Array.isArray(formData.accessibility_features) ? formData.accessibility_features : [],
      wheelchair_accessible: formData.accessibility_features?.includes("wheelchair_accessible") ?? false,
      sensory_friendly: formData.accessibility_features?.includes("sensory_friendly") ?? false,
      childcare_provided: formData.accessibility_features?.includes("childcare_provided") ?? false,
      asl_interpreter: formData.accessibility_features?.includes("asl_interpreter") ?? false,
      free_admission: formData.accessibility_features?.includes("free_admission") ?? false,
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
    setFormData((prev) => {
      const next = prev.networks.includes(name)
        ? prev.networks.filter((n) => n !== name)
        : [...prev.networks, name];
      return {
        ...prev,
        networks: next,
        network_only: next.length === 0 ? false : prev.network_only,
      };
    });
  };

  const toggleEventType = (type) => {
    setFormData((prev) => ({
      ...prev,
      event_types: prev.event_types.includes(type)
        ? prev.event_types.filter((t) => t !== type)
        : [...prev.event_types, type],
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
    setFormData((prev) => {
      const next = prev.accessibility_features.includes(feature)
        ? prev.accessibility_features.filter((f) => f !== feature)
        : [...prev.accessibility_features, feature];
      return { ...prev, accessibility_features: next };
    });
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
          const normalized = { ...draft };
          if (draft.event_type != null && !Array.isArray(draft.event_types)) normalized.event_types = draft.event_type ? [draft.event_type] : [];
          if (draft.image != null && !Array.isArray(draft.images)) normalized.images = draft.image ? [draft.image] : [];
          delete normalized.event_type;
          delete normalized.image;
          setFormData((prev) => ({ ...prev, ...normalized }));
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
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Basic Information
          </h3>
          <div data-error="title">
            <Label className="text-foreground-soft">Event Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="bg-card border-border text-foreground mt-1"
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
            <Label className="text-foreground-soft">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="bg-card border-border text-foreground mt-1 min-h-[100px]"
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
          <h3 className="text-lg font-semibold text-foreground">Date & Time</h3>
          <div data-error="start_date">
            <Label className="text-foreground-soft">Start Date *</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left bg-card border-border text-foreground mt-1"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date
                    ? format(formData.start_date, "PPP")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground-soft">Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, start_time: e.target.value }))
                }
                className="bg-card border-border text-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-foreground-soft">End</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEndTimeMode("duration")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    endTimeMode === "duration"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground-soft border border-border hover:border-primary/50"
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
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground-soft border border-border hover:border-primary/50"
                  )}
                >
                  End Time
                </button>
              </div>
            </div>
          </div>

          {endTimeMode === "duration" ? (
            <div>
              <Label className="text-foreground-soft">Duration</Label>
              <Select
                value={String(formData.duration_minutes)}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration_minutes: parseInt(v, 10),
                  }))
                }
              >
                <SelectTrigger className="bg-card border-border text-foreground mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {durationPresets
                    .filter((d) => d.active !== false)
                    .map((duration) => (
                      <SelectItem
                        key={duration.value ?? duration.minutes}
                        value={String(duration.minutes ?? duration.value)}
                        className="text-foreground-soft"
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
                <Label className="text-foreground-soft">End Time *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-card border-border text-foreground mt-1"
                />
                {errors.end_time && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.end_time}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-foreground-soft">Different end date (optional)</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left bg-card border-border text-foreground mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Same day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border">
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
                    className="text-muted-foreground text-sm mt-1 hover:text-foreground"
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
        {isAppAdmin ? (
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsRecurring(!isRecurring)}
              onKeyDown={(e) => e.key === "Enter" && setIsRecurring(!isRecurring)}
              className="flex items-center justify-between cursor-pointer rounded-lg border border-transparent hover:border-primary/50 transition-colors -m-1 p-1"
            >
              <div className="pointer-events-none">
                <p className="text-foreground font-medium">This event repeats</p>
                <p className="text-muted-foreground text-sm">
                  Create multiple event instances on a schedule
                </p>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 pointer-events-none",
                  isRecurring ? "bg-primary" : "bg-surface"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-slate-300 shadow-sm transition-transform",
                    isRecurring ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <Label className="text-foreground-soft">Pattern</Label>
                  <Select
                    value={recurrencePattern}
                    onValueChange={setRecurrencePattern}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      <SelectItem value="daily" className="text-foreground-soft">
                        Daily
                      </SelectItem>
                      <SelectItem value="weekly" className="text-foreground-soft">
                        Weekly
                      </SelectItem>
                      <SelectItem value="biweekly" className="text-foreground-soft">
                        Every 2 weeks
                      </SelectItem>
                      <SelectItem value="monthly" className="text-foreground-soft">
                        Monthly
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(recurrencePattern === "weekly" ||
                  recurrencePattern === "biweekly") && (
                  <div>
                    <Label className="text-foreground-soft">Repeats on</Label>
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
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-secondary border-border text-foreground hover:border-border"
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
                  <Label className="text-foreground-soft">Ends on (Optional)</Label>
                  <Popover open={recurrenceEndDateOpen} onOpenChange={setRecurrenceEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start mt-1 bg-secondary border-border text-foreground hover:bg-surface"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recurrenceEndDate
                          ? format(recurrenceEndDate, "PPP")
                          : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-secondary border-border p-0 w-auto">
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
                      className="text-muted-foreground text-sm mt-1 hover:text-foreground"
                    >
                      Clear end date
                    </button>
                  )}
                </div>
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-xs text-primary">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Each occurrence will be created as a separate event
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border/50 rounded-xl mt-2 opacity-50 cursor-not-allowed">
            <div className="flex-1">
              <p className="text-muted-foreground font-medium">This event repeats</p>
              <p className="text-muted-foreground/70 text-sm">Create multiple event instances on a schedule</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/70">Coming Soon</span>
              <Lock className="h-4 w-4 text-primary/70" />
            </div>
          </div>
        )}

        {/* Location / Virtual / TBD */}
        <div className="space-y-3">
          <Label className="text-foreground-soft">Location</Label>
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground-soft border border-border hover:border-primary/50"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground-soft border border-border hover:border-primary/50"
              )}
            >
              Location TBD
            </button>
          </div>

          {formData.is_virtual ? (
            <div className="space-y-3 pt-2">
              <div data-error="virtual_url">
                <Label className="text-foreground-soft">Virtual Meeting Link *</Label>
                <Input
                  type="url"
                  value={formData.virtual_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, virtual_url: e.target.value }))
                  }
                  className="bg-card border-border text-foreground mt-1"
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
                <Label className="text-foreground-soft">Platform</Label>
                <Select
                  value={formData.virtual_platform || "zoom"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, virtual_platform: v }))
                  }
                >
                  <SelectTrigger className="bg-card border-border text-foreground mt-1">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="zoom" className="text-foreground-soft">Zoom</SelectItem>
                    <SelectItem value="google_meet" className="text-foreground-soft">Google Meet</SelectItem>
                    <SelectItem value="microsoft_teams" className="text-foreground-soft">Microsoft Teams</SelectItem>
                    <SelectItem value="other" className="text-foreground-soft">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div data-error="location" className="pt-2">
              <Label className="text-foreground-soft">
                {formData.is_location_tbd ? "Location (optional)" : "Location *"}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="bg-card border-border text-foreground"
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

        {/* Images (up to 3) */}
        <div>
          <Label className="text-foreground-soft">Event Images</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            {(formData.images || []).map((url, index) => (
              <div key={url + index} className="relative group w-32 h-32">
                <img
                  src={url}
                  alt=""
                  className="w-32 h-32 object-cover rounded-lg border border-border"
                />
                {index === 0 && (
                  <span className="absolute top-1 right-1 bg-card/80 px-2 py-1 rounded text-xs text-foreground-soft">
                    Hero
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute bottom-1 right-1 p-1 bg-red-600 rounded hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-foreground" />
                </button>
              </div>
            ))}
            {(formData.images || []).length < 3 && (
              <label className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Up to 3 images. First image is the hero. Recommended: 1200×675px (16:9)
          </p>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Pricing
          </h3>
          <div data-error="pricing_type">
            <Label className="text-foreground-soft">Pricing Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["free", "single_price", "multiple_tickets", "pay_what_you_wish"].map((type) => {
                const isDisabled = false;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        pricing_type: type,
                        price: type === "free" ? "" : prev.price,
                        min_price: type === "pay_what_you_wish" ? prev.min_price : "",
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1",
                      formData.pricing_type === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground-soft border border-border hover:border-primary/50"
                    )}
                  >
                    {type === "free" && "Free"}
                    {type === "single_price" && "Single Price"}
                    {type === "multiple_tickets" && "Multiple Tickets"}
                    {type === "pay_what_you_wish" && "Pay What You Wish"}
                  </button>
                );
              })}
            </div>
            {errors.pricing_type && (
              <p className="text-red-400 text-sm mt-1">{errors.pricing_type}</p>
            )}
          </div>
          {formData.pricing_type === "single_price" && (
            <div data-error="price">
              <Label className="text-foreground-soft">Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                className="bg-card border-border text-foreground mt-1 w-32"
              />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
              )}
            </div>
          )}
          {formData.pricing_type === "multiple_tickets" && (
            <div className="space-y-3" data-error="ticket_types">
              {(formData.ticket_types || []).map((ticket, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Tier name"
                      value={ticket.name}
                      onChange={(e) => updateTicketType(index, "name", e.target.value)}
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={ticket.price}
                      onChange={(e) => updateTicketType(index, "price", e.target.value)}
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Limit (optional)"
                      value={ticket.quantity_limit}
                      onChange={(e) => updateTicketType(index, "quantity_limit", e.target.value)}
                      className="bg-surface border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
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
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
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
              <Label className="text-foreground-soft">Minimum suggested ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.min_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, min_price: e.target.value }))
                }
                className="bg-card border-border text-foreground mt-1 w-32"
                placeholder="0"
              />
              {errors.min_price && (
                <p className="text-red-400 text-sm mt-1">{errors.min_price}</p>
              )}
            </div>
          )}
        </div>

        {/* Joy Coins */}
        {isAppAdmin ? (
          <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/50">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Joy Coins
            </h3>
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setFormData((prev) => ({ ...prev, joy_coin_enabled: !prev.joy_coin_enabled }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                setFormData((prev) => ({ ...prev, joy_coin_enabled: !prev.joy_coin_enabled }))
              }
              className="flex items-center justify-between cursor-pointer rounded-lg border border-transparent hover:border-primary/50 transition-colors -m-1 p-1"
            >
              <span className="text-foreground-soft pointer-events-none">
                Accept Joy Coins for this event
              </span>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 pointer-events-none",
                  formData.joy_coin_enabled ? "bg-primary" : "bg-surface"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-slate-300 shadow-sm transition-transform",
                    formData.joy_coin_enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </div>
            </div>
            {formData.joy_coin_enabled && (
              <div className="space-y-4 pt-3 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground-soft">Coins per person</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.joy_coin_cost}
                      onChange={(e) => setFormData((prev) => ({ ...prev, joy_coin_cost: e.target.value }))}
                      className="bg-card border-border text-foreground mt-1"
                      placeholder="e.g., 3"
                    />
                  </div>
                  {!formData.joy_coin_unlimited && (
                    <div>
                      <Label className="text-foreground-soft">Joy Coin spots</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.joy_coin_spots}
                        onChange={(e) => setFormData((prev) => ({ ...prev, joy_coin_spots: e.target.value }))}
                        className="bg-card border-border text-foreground mt-1"
                        placeholder="Defaults to capacity"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-foreground-soft">Max party size</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.max_party_size}
                      onChange={(e) => setFormData((prev) => ({ ...prev, max_party_size: e.target.value }))}
                      className="bg-card border-border text-foreground mt-1 w-24"
                      placeholder="10"
                    />
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setFormData((prev) => ({ ...prev, joy_coin_unlimited: !prev.joy_coin_unlimited }))}
                    onKeyDown={(e) => e.key === "Enter" && setFormData((prev) => ({ ...prev, joy_coin_unlimited: !prev.joy_coin_unlimited }))}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-foreground-soft text-sm">Unlimited spots</span>
                    <div
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                        formData.joy_coin_unlimited ? "bg-primary" : "bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 rounded-full bg-slate-300 shadow-sm transition-transform",
                          formData.joy_coin_unlimited ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground-soft">Attendance limit (optional)</Label>
                  <p className="text-xs text-muted-foreground/70">Limit how often the same member can attend</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={formData.frequency_limit_count}
                      onChange={(e) => setFormData((prev) => ({ ...prev, frequency_limit_count: e.target.value }))}
                      className="bg-card border-border text-foreground w-20"
                      placeholder="∞"
                    />
                    <span className="text-muted-foreground">times per</span>
                    <Select
                      value={formData.frequency_limit_period}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, frequency_limit_period: value }))}
                    >
                      <SelectTrigger className="w-32 bg-card border-border text-foreground">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="week" className="text-foreground-soft">week</SelectItem>
                        <SelectItem value="month" className="text-foreground-soft">month</SelectItem>
                        <SelectItem value="total" className="text-foreground-soft">total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-foreground-soft">Refund policy</Label>
                    <Select
                      value={formData.refund_policy || "moderate"}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, refund_policy: value }))}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="flexible" className="text-foreground-soft">Flexible (2 hours)</SelectItem>
                        <SelectItem value="moderate" className="text-foreground-soft">Moderate (24 hours)</SelectItem>
                        <SelectItem value="strict" className="text-foreground-soft">Strict (no refunds)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setFormData((prev) => ({ ...prev, adults_only: !prev.adults_only }))}
                    onKeyDown={(e) => e.key === "Enter" && setFormData((prev) => ({ ...prev, adults_only: !prev.adults_only }))}
                    className="flex items-center gap-3 cursor-pointer pt-6"
                  >
                    <span className="text-foreground-soft text-sm">18+ only</span>
                    <div
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                        formData.adults_only ? "bg-primary" : "bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 rounded-full bg-slate-300 shadow-sm transition-transform",
                          formData.adults_only ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 border border-border/50 rounded-xl opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary/50" />
                <h3 className="text-muted-foreground font-semibold">Joy Coins</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary/70">Coming Soon</span>
                <Lock className="h-4 w-4 text-primary/70" />
              </div>
            </div>
            <p className="text-muted-foreground/70 text-sm mt-2">Accept Joy Coins for this event</p>
          </div>
        )}

        {/* Event Type */}
        <div data-error="event_types">
          <Label className="text-foreground-soft">Event Type</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {(eventTypes || [])
              .filter((t) => t.active !== false)
              .map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleEventType(type.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    formData.event_types?.includes(type.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground-soft border border-border hover:border-primary/50"
                  )}
                >
                  {type.label}
                </button>
              ))}
          </div>
          {errors.event_types && (
            <p className="text-red-400 text-sm mt-1">{errors.event_types}</p>
          )}
        </div>

        {/* Networks — only show if business has assigned networks (or admin sees all) */}
        {allowedNetworks.length > 0 && (
          <div>
            <Label className="text-foreground-soft">Networks / Communities (optional)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allowedNetworks.map((network) => {
                const slug = network.value ?? network.slug ?? network.id;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleNetwork(slug)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      formData.networks.includes(slug)
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground-soft border border-border hover:border-primary/50"
                    )}
                  >
                    {network.label ?? network.name ?? slug}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Network Members Only — visible only when a network is selected */}
        {allowedNetworks.length > 0 && formData.networks?.length > 0 && (
          <div className="space-y-4 p-4 border border-border rounded-lg">
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setFormData((prev) => ({ ...prev, network_only: !prev.network_only }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                setFormData((prev) => ({ ...prev, network_only: !prev.network_only }))
              }
              className="flex items-center justify-between cursor-pointer rounded-lg border border-transparent hover:border-primary/50 transition-colors -m-1 p-1"
            >
              <div className="pointer-events-none flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-medium">Network Members Only</p>
                  <p className="text-muted-foreground text-sm">
                    Only visible to users following this network
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 pointer-events-none",
                  formData.network_only ? "bg-primary" : "bg-surface"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-slate-300 shadow-sm transition-transform",
                    formData.network_only ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Age / Audience */}
        <div>
          <Label className="text-foreground-soft">Age / Audience (optional)</Label>
          <Select
            value={formData.age_info || "none"}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                age_info: v === "none" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="none" className="text-foreground-soft">
                —
              </SelectItem>
              {ageGroups
                .filter((a) => a.active !== false)
                .map((age) => (
                  <SelectItem
                    key={age.value}
                    value={age.value}
                    className="text-foreground-soft"
                  >
                    {age.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Capacity */}
        <div>
          <Label className="text-foreground-soft">Capacity (optional)</Label>
          <Input
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, capacity: e.target.value }))
            }
            className="bg-card border-border text-foreground mt-1 w-32"
            placeholder="e.g., 50"
          />
        </div>

        {/* Additional Settings */}
        <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
          <h3 className="text-lg font-semibold text-foreground">Additional Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground-soft">Accept RSVPs for this event</Label>
              <p className="text-sm text-muted-foreground mt-0.5">Allow attendees to RSVP through Local Lane</p>
            </div>
            <Switch
              checked={formData.accepts_rsvps}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, accepts_rsvps: checked }))
              }
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div>
            <Label className="text-foreground-soft">Additional Notes (Optional)</Label>
            <Textarea
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, additional_notes: e.target.value }))
              }
              className="bg-card border-border text-foreground mt-1 min-h-[80px]"
              placeholder="Parking details, what to bring, etc."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-foreground-soft">Accessibility (Optional)</Label>
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
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-secondary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                        formData.accessibility_features?.includes(opt.value)
                          ? "bg-primary border-primary"
                          : "border-border bg-transparent"
                      )}
                    >
                      {formData.accessibility_features?.includes(opt.value) && (
                        <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-foreground text-sm">{opt.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-border">
          {lastSaved && (
            <p className="text-xs text-muted-foreground/70 text-center">
              Last auto-saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </p>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              onClick={onCancel}
              className="bg-transparent border-none text-muted-foreground hover:text-foreground-soft hover:underline hover:bg-transparent w-full sm:w-auto px-6 sm:px-8 py-3 shadow-none order-3 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, { isDraft: true })}
              className="bg-transparent border border-border text-foreground hover:bg-secondary hover:border-muted-foreground w-full sm:w-auto px-6 sm:px-8 py-3 order-2 sm:order-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold w-full sm:w-auto px-6 sm:px-8 py-3 order-1 sm:order-3"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publish Event
            </Button>
          </div>
        </div>
      </form>
  );
}
