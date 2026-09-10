// ==================================================
// Database Types
// ==================================================
// TypeScript types mirroring the database schema.
// These will be replaced by Supabase-generated types
// once the database is provisioned.

import type {
  OrganizationStatus,
  DomainType,
  DomainStatus,
  UserRole,
  MembershipStatus,
  VehicleStatus,
  LessonTypeStatus,
  TransmissionType,
  PackageStatus,
  DayOfWeek,
  BlockedTimeReason,
  BookingStatus,
  SkillLevel,
  PackagePurchaseStatus,
  ReviewStatus,
  SuccessStoryStatus,
  ConsentMethod,
  PaymentStatus,
  PaymentType,
  RefundStatus,
  WebhookStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  SubscriptionStatus,
  BillingInterval,
  WaitlistStatus,
} from '@/config/constants';

// --- Organizations ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  currency: string;
  country: string;
  phone: string | null;
  email: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

// --- Organization Domains ---

export interface OrganizationDomain {
  id: string;
  organization_id: string;
  hostname: string;
  domain_type: DomainType;
  status: DomainStatus;
  is_primary: boolean;
  redirect_to_primary: boolean;
  verification_method: string | null;
  verification_token: string | null;
  ssl_status: string | null;
  external_provider_domain_id: string | null;
  last_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Organization Members ---

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
}

// --- Profiles ---

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// --- Locations ---

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Instructors ---

export interface Instructor {
  id: string;
  organization_id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  license_number: string | null;
  license_expiry: string | null;
  transmission_type: TransmissionType;
  is_active: boolean;
  max_daily_lessons: number | null;
  default_lesson_duration: number;
  created_at: string;
  updated_at: string;
}

// --- Students ---

export interface Student {
  id: string;
  organization_id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  pickup_address: string | null;
  pickup_suburb: string | null;
  pickup_postcode: string | null;
  learner_permit_number: string | null;
  permit_expiry: string | null;
  preferred_transmission: TransmissionType | null;
  preferred_instructor_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Vehicles ---

export interface Vehicle {
  id: string;
  organization_id: string;
  name: string;
  make: string;
  model: string;
  year: number | null;
  registration: string | null;
  transmission: TransmissionType;
  status: VehicleStatus;
  assigned_instructor_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Service Areas ---

export interface ServiceArea {
  id: string;
  organization_id: string;
  name: string;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstructorServiceArea {
  id: string;
  instructor_id: string;
  service_area_id: string;
  travel_buffer_minutes: number;
  created_at: string;
}

// --- Lesson Types ---

export interface LessonType {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  transmission: TransmissionType;
  status: LessonTypeStatus;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// --- Lesson Packages ---

export interface LessonPackage {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  lesson_type_id: string;
  lesson_count: number;
  price_cents: number;
  savings_cents: number;
  validity_days: number | null;
  status: PackageStatus;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// --- School Settings ---

export interface SchoolSettings {
  id: string;
  organization_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  about_text: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  meta_title: string | null;
  meta_description: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_google_review: string | null;
  social_tiktok: string | null;
  min_booking_notice_hours: number;
  max_advance_booking_days: number;
  cancellation_notice_hours: number;
  allow_online_booking: boolean;
  default_lesson_duration: number;
  default_travel_buffer_minutes: number;
  default_transmission: TransmissionType;
  sections_enabled: string[];
  /** Pending draft content changes (partial JSON of content fields). Null = no draft. */
  draft_content: Record<string, unknown> | null;
  /** When website content was last published (draft→live). */
  content_published_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Media Assets ---

export interface MediaAsset {
  id: string;
  organization_id: string;
  storage_path: string;
  public_url: string;
  bucket_name: string;
  filename: string;
  alt_text: string | null;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  folder: string;
  tags: string[];
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Availability Rules ---

export interface AvailabilityRule {
  id: string;
  organization_id: string;
  instructor_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Availability Exceptions ---

export interface AvailabilityException {
  id: string;
  organization_id: string;
  instructor_id: string;
  exception_date: string; // YYYY-MM-DD
  is_available: boolean;
  start_time: string | null; // HH:MM:SS, set when is_available=true
  end_time: string | null; // HH:MM:SS, set when is_available=true
  reason: string | null;
  created_at: string;
  updated_at: string;
}

// --- Blocked Times ---

export interface BlockedTime {
  id: string;
  organization_id: string;
  instructor_id: string;
  start_datetime: string; // ISO 8601
  end_datetime: string; // ISO 8601
  reason: BlockedTimeReason;
  notes: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
}

// --- Bookings ---

export interface Booking {
  id: string;
  organization_id: string;
  instructor_id: string;
  student_id: string;
  lesson_type_id: string;
  vehicle_id: string | null;
  start_datetime: string; // ISO 8601
  end_datetime: string; // ISO 8601
  status: BookingStatus;
  pickup_address: string | null;
  pickup_suburb: string | null;
  pickup_postcode: string | null;
  service_area_id: string | null;
  price_cents: number;
  notes: string | null;
  admin_notes: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  rescheduled_from_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --- Booking Status History ---

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  previous_status: BookingStatus | null;
  new_status: BookingStatus;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

// --- Driving Skills ---

export interface DrivingSkill {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Student Progress ---

export interface StudentProgress {
  id: string;
  organization_id: string;
  student_id: string;
  skill_id: string;
  level: SkillLevel;
  assessed_by: string | null;
  assessed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Student Package Purchases ---

export interface StudentPackagePurchase {
  id: string;
  organization_id: string;
  student_id: string;
  lesson_package_id: string;
  lessons_total: number;
  lessons_used: number;
  price_paid_cents: number;
  status: PackagePurchaseStatus;
  purchased_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Reviews ---

export interface Review {
  id: string;
  organization_id: string;
  student_id: string | null;
  instructor_id: string | null;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  google_review_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

// --- Success Stories ---

export interface SuccessStory {
  id: string;
  organization_id: string;
  student_name: string;
  student_id: string | null;
  instructor_id: string | null;
  photo_url: string | null;
  test_location: string | null;
  pass_date: string | null;
  message: string | null;
  status: SuccessStoryStatus;
  consent_given: boolean;
  consent_given_at: string | null;
  consent_given_by: string | null;
  consent_method: ConsentMethod | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Payments ---

export interface Payment {
  id: string;
  organization_id: string;
  student_id: string | null;
  booking_id: string | null;
  package_purchase_id: string | null;
  payment_type: PaymentType;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_charge_id: string | null;
  amount_refunded_cents: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// --- Refunds ---

export interface Refund {
  id: string;
  organization_id: string;
  payment_id: string;
  amount_cents: number;
  status: RefundStatus;
  reason: string | null;
  stripe_refund_id: string | null;
  refunded_by: string | null;
  processed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// --- Webhook Events ---

export interface WebhookEvent {
  id: string;
  organization_id: string | null;
  provider: string;
  event_id: string;
  event_type: string;
  status: WebhookStatus;
  payload: Record<string, unknown>;
  processing_errors: string[] | null;
  attempts: number;
  max_attempts: number;
  received_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Notification Templates ---

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Notifications ---

export interface Notification {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  booking_id: string | null;
  payment_id: string | null;
  status: NotificationStatus;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  attempts: number;
  max_attempts: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Notification Preferences ---

export interface NotificationPreference {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// --- Plans ---

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  max_instructors: number | null;
  max_students: number | null;
  max_locations: number | null;
  max_vehicles: number | null;
  max_bookings_per_month: number | null;
  custom_domain_enabled: boolean;
  sms_enabled: boolean;
  student_progress_enabled: boolean;
  advanced_reports_enabled: boolean;
  waitlist_enabled: boolean;
  custom_branding_enabled: boolean;
  api_access_enabled: boolean;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  trial_days: number;
  created_at: string;
  updated_at: string;
}

// --- Subscriptions ---

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Subscription Usage ---

export interface SubscriptionUsage {
  id: string;
  organization_id: string;
  subscription_id: string;
  period_start: string;
  period_end: string;
  instructors_count: number;
  students_count: number;
  locations_count: number;
  vehicles_count: number;
  bookings_count: number;
  created_at: string;
  updated_at: string;
}

// --- Audit Logs ---

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// --- Feature Flags ---

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  allowed_organizations: string[];
  created_at: string;
  updated_at: string;
}

// --- Waitlist Entries ---

export interface WaitlistEntry {
  id: string;
  organization_id: string;
  student_id: string;
  preferred_days: string[];
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  preferred_instructor_id: string | null;
  lesson_type_id: string | null;
  service_area_id: string | null;
  status: WaitlistStatus;
  priority: number;
  notes: string | null;
  notified_at: string | null;
  expires_at: string | null;
  booked_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Custom Themes ---

export interface CustomTheme {
  id: string;
  organization_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  header_bg_color: string | null;
  footer_bg_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  header_style: string;
  footer_style: string;
  hero_style: string;
  corner_radius: string;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}
