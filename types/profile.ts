export type WorkMode = "remote" | "hybrid" | "office";

export type JobType = "part-time" | "internship" | "fresher" | "experienced";

export type IndianLocation =
  | "Bengaluru"
  | "Chennai"
  | "Delhi NCR"
  | "Hyderabad"
  | "Kolkata"
  | "Mumbai"
  | "Pune"
  | "Ahmedabad"
  | "Jaipur"
  | "Remote India";

export type CandidateProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  school: string;
  college: string;
  experience: string;
  skills: string[];
  projects: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  resumeContentType?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  preferredLocations: IndianLocation[];
  workModes: WorkMode[];
  jobTypes: JobType[];
  salaryRange: {
    min: number;
    max: number;
  };
  currentSalary?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  yearsOfExperience?: string;
  dailyApplyTime: string;
  profileCompleted: boolean;
  autoApplyEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParsedResumeProfile = Partial<
  Pick<
    CandidateProfile,
    | "name"
    | "email"
    | "phone"
    | "address"
    | "school"
    | "college"
    | "experience"
    | "skills"
    | "projects"
    | "linkedinUrl"
    | "portfolioUrl"
  >
>;
