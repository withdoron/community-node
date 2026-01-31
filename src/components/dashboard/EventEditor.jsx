import React, { useState, useEffect } from "react";
import { format, addMinutes, parseISO } from "date-fns";
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
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("weekly");
  const [selectedDays, setSelectedDays] = useState([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);
  const [recurrenceEndDateOpen, setRecurrenceEndDateOpen] = useState(false);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

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
      });
    }
  }, [existingEvent, networks, ageGroups]);

  const validate = () => {
    const e = {};
    if (!formData.title?.trim()) e.title = "Title is required";
    if (!formData.start_date) e.start_date = "Start date is required";
    if (!formData.location?.trim()) e.location = "Location is required";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors before saving");
      return;
    }
    setIsSubmitting(true);

    const start = new Date(formData.start_date);
    const [h, m] = formData.start_time.split(":").map(Number);
    start.setHours(h, m, 0, 0);
    const end = addMinutes(start, formData.duration_minutes);

    // Step 3: map to backend field names (date, punch_pass_accepted, network, thumbnail_url)
    const eventData = {
      business_id: business.id,
      title: formData.title.trim(),
      description: formData.description.trim(),

      // Date fields
      date: start.toISOString(), // NOT start_date
      end_date: end.toISOString(),
      duration_minutes: formData.duration_minutes,

      // Location
      location: formData.location.trim() || null,

      // Image
      thumbnail_url: formData.image || null, // NOT images array

      // Pricing
      pricing_type: formData.pricing_type,
      price: parseFloat(formData.price) || 0,
      is_free: formData.pricing_type === "free",
      is_pay_what_you_wish: formData.pricing_type === "pay_what_you_wish",
      min_price: parseFloat(formData.min_price) || 0,

      // Punch Pass
      punch_pass_accepted: canUsePunchPass ? formData.punch_pass_eligible : false, // NOT punch_pass_eligible
      punch_cost: formData.punch_cost ?? 1,

      // Categorization
      event_type: formData.event_type || null,
      network: formData.networks?.[0] ?? null, // Single value, NOT array
      age_info: formData.age_info?.trim() || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,

      // Status
      status: tier === "basic" ? "pending_review" : "published",
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
    };

    try {
      await Promise.resolve(onSave(eventData));
      toast.success(
        eventData.status === "pending_review"
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
          </div>
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

        {/* Location */}
        <div data-error="location">
          <Label className="text-slate-300">Location *</Label>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4 text-slate-400" />
            <Input
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., 123 Main St, City"
            />
          </div>
          {errors.location && (
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.location}
            </p>
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
              {["free", "single_price", "pay_what_you_wish"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      pricing_type: type,
                      price: type === "free" ? "" : prev.price,
                      min_price:
                        type === "pay_what_you_wish" ? prev.min_price : "",
                    }))
                  }
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    formData.pricing_type === type
                      ? "bg-amber-500 text-black"
                      : "bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500/50"
                  )}
                >
                  {type === "free" && "Free"}
                  {type === "single_price" && "Single Price"}
                  {type === "pay_what_you_wish" && "Pay What You Wish"}
                </button>
              ))}
            </div>
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

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {existingEvent ? "Save Event" : "Create Event"}
          </Button>
        </div>
      </form>
  );
}
