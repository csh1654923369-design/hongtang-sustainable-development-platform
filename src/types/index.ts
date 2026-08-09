export enum UserRole {
  Visitor = "visitor",
  Resident = "resident",
  Collaborator = "collaborator",
  Admin = "admin",
}

export enum IssueStatus {
  Pending = "pending",
  Accepted = "accepted",
  Assigned = "assigned",
  Processing = "processing",
  Completed = "completed",
  Rated = "rated",
  Rejected = "rejected",
}

export enum ProjectStatus {
  Planning = "planning",
  Discussion = "discussion",
  Active = "active",
  Completed = "completed",
  Maintenance = "maintenance",
}

export enum MicroActionStatus {
  Pending = "pending",
  Recruiting = "recruiting",
  Experimenting = "experimenting",
  Reviewing = "reviewing",
  Completed = "completed",
}

export enum MapFeatureType {
  Garden = "garden",
  TeaGarden = "tea-garden",
  TeaFactory = "tea-factory",
  WaterFacility = "water-facility",
  SolarFacility = "solar-facility",
  SafetyRisk = "safety-risk",
  VillageMemory = "village-memory",
  Issue = "issue",
  Project = "project",
  CommunityAction = "community-action",
  ResourceOffer = "resource-offer",
  ResourceNeed = "resource-need",
  CompletedAction = "completed-action",
  PublicService = "public-service",
  Ecology = "ecology",
  Culture = "culture",
  ResearchPhoto = "research-photo",
  Building = "building",
  Road = "road",
  Water = "water",
}

export enum ReviewStatus {
  Pending = "pending",
  Approved = "approved",
  Revision = "revision",
  Duplicate = "duplicate",
  Rejected = "rejected",
}

export interface DemoRecord {
  id: string;
  isDemo: true;
}

export interface User extends DemoRecord {
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface RoleDefinition {
  id: UserRole;
  label: string;
  shortLabel: string;
  description: string;
}

export interface VillageProfile extends DemoRecord {
  name: string;
  summary: string;
  notice: string;
}

export interface SustainabilityGoal extends DemoRecord {
  index: number;
  title: string;
  shortTitle: string;
  description: string;
  meaning: string;
  status: string;
  projectCount: number;
  indicatorIds: string[];
  sdgTags: string[];
  color: string;
  icon: string;
  challenges: string[];
}

export interface IndicatorRecord {
  period: string;
  value: number;
}

export interface Indicator extends DemoRecord {
  goalId: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  trend: "up" | "down" | "stable";
  change: string;
  updatedAt: string;
  source: string;
  completeness: number;
  definition: string;
  method: string;
  projectIds: string[];
  records: IndicatorRecord[];
}

export interface ProjectUpdate extends DemoRecord {
  date: string;
  title: string;
  content: string;
  stage: string;
  author: string;
}

export interface ProjectTask extends DemoRecord {
  title: string;
  description: string;
  effort: string;
  role: string;
  slots: number;
  status: "open" | "claimed" | "completed";
}

export interface ProjectResourceNeed extends DemoRecord {
  label: string;
  category: "space" | "tool" | "material" | "skill" | "knowledge" | "time";
  quantity: string;
  status: "open" | "matched";
}

export interface Project extends DemoRecord {
  slug: string;
  title: string;
  summary: string;
  background: string;
  goalId: string;
  status: ProjectStatus;
  progress: number;
  location: string;
  lead: string;
  updatedAt: string;
  startDate: string;
  participantCount: number;
  recruiting: boolean;
  type: string;
  budgetLabel: string;
  participants: string[];
  origin: string;
  evidence: string[];
  communityVoices: string[];
  facilitator: string;
  nextMeeting: string;
  decisionMethod: string;
  maintenanceOwner: string;
  tasks: ProjectTask[];
  resourceNeeds: ProjectResourceNeed[];
  accent: string;
  updates: ProjectUpdate[];
  relatedIssueIds: string[];
  relatedActivityIds: string[];
}

export interface MicroActionUpdate extends DemoRecord {
  date: string;
  title: string;
  content: string;
  author: string;
}

export interface MicroAction extends DemoRecord {
  code: string;
  title: string;
  summary: string;
  desiredChange: string;
  goalId: string;
  status: MicroActionStatus;
  location: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  initiator: string;
  facilitator: string;
  submittedByMe: boolean;
  createdAt: string;
  durationDays: number;
  participantCount: number;
  existingAssets: string[];
  neededResources: string[];
  rolesNeeded: string[];
  nextStep: string;
  maintenancePlan: string;
  decisionMethod: string;
  updates: MicroActionUpdate[];
}

export interface NewMicroActionInput {
  title: string;
  summary: string;
  desiredChange: string;
  goalId: string;
  location: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  durationDays: number;
  existingAssets: string[];
  neededResources: string[];
  rolesNeeded: string[];
  nextStep: string;
  maintenancePlan: string;
  decisionMethod: string;
}

export type CommunityResourceMode = "offer" | "need";
export type CommunityResourceCategory = "space" | "tool" | "material" | "skill" | "knowledge" | "time";

export interface CommunityResource extends DemoRecord {
  mode: CommunityResourceMode;
  category: CommunityResourceCategory;
  title: string;
  description: string;
  location: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  availability: string;
  contactLabel: string;
  status: "open" | "matched";
  updatedAt: string;
  privacy: "public-area" | "group-only";
  goalId: string;
  submittedByMe: boolean;
  relatedActionId?: string;
}

export interface NewCommunityResourceInput {
  mode: CommunityResourceMode;
  category: CommunityResourceCategory;
  title: string;
  description: string;
  location: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  availability: string;
  privacy: "public-area" | "group-only";
  goalId: string;
}

export interface IssueStatusHistory extends DemoRecord {
  date: string;
  status: IssueStatus;
  title: string;
  description: string;
  operator: string;
}

export interface IssueReport extends DemoRecord {
  code: string;
  title: string;
  description: string;
  type: string;
  location: string;
  longitude: number;
  latitude: number;
  status: IssueStatus;
  submitterType: UserRole;
  submittedAt: string;
  updatedAt: string;
  urgent: boolean;
  affectsDailyLife: boolean;
  publicName: boolean;
  imageLabel: string;
  afterImageLabel?: string;
  assignee?: string;
  result?: string;
  goalId: string;
  projectId?: string;
  rating?: number;
  history: IssueStatusHistory[];
}

export interface Activity extends DemoRecord {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registered: number;
  status: "open" | "full" | "ended";
  goalId: string;
}

export interface SurveyOption {
  id: string;
  label: string;
  votes: number;
}

export interface Survey extends DemoRecord {
  title: string;
  description: string;
  type: "single" | "multiple" | "mixed";
  responses: number;
  status: "open" | "closed";
  options: SurveyOption[];
}

export interface SurveyResponse extends DemoRecord {
  surveyId: string;
  userId: string;
  optionIds: string[];
  text?: string;
  submittedAt: string;
}

export interface Suggestion extends DemoRecord {
  title: string;
  content: string;
  submittedAt: string;
  supportCount: number;
  response?: string;
  status: "pending" | "responded" | "discussion" | "adopted" | "declined";
}

export interface Comment extends DemoRecord {
  author: string;
  role: UserRole;
  content: string;
  createdAt: string;
}

export interface GeometryPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface SpatialFeature {
  id: string;
  isDemo: boolean;
  title: string;
  featureType: MapFeatureType;
  status: string;
  location: string;
  description: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  updatedAt: string;
  goalId: string;
  publicParticipation: boolean;
  submittedByMe: boolean;
  geometry: GeometryPoint;
  geojson?: Record<string, unknown>;
  linkedId?: string;
  imageLabel: string;
  imageUrls?: string[];
  sourceLabel?: string;
  waterSystemBranch?: "supply" | "drainage" | "both";
}

export interface ResearchSubmission extends DemoRecord {
  title: string;
  type: string;
  surveyDate: string;
  researchers: string;
  location: string;
  description: string;
  source: string;
  publicAllowed: boolean;
  status: ReviewStatus;
  reviewNote?: string;
  featureType?: MapFeatureType;
}

export interface MediaFile extends DemoRecord {
  name: string;
  type: string;
  url: string;
  ownerId: string;
}

export interface ReviewRecord extends DemoRecord {
  submissionId: string;
  reviewer: string;
  status: ReviewStatus;
  note: string;
  reviewedAt: string;
}

export interface Notification extends DemoRecord {
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface AuditLog extends DemoRecord {
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface ActivityRegistration extends DemoRecord {
  activityId: string;
  userId: string;
  createdAt: string;
}

export interface NewIssueInput {
  title: string;
  description: string;
  type: string;
  location: string;
  longitude: number;
  latitude: number;
  urgent: boolean;
  affectsDailyLife: boolean;
  publicName: boolean;
  imageLabel: string;
}
