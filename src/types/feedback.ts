export interface StageRating {
  id: string;
  enterprise_id: string;
  candidate_id: string;
  pipeline_stage_id: string;
  rating: number;
  updated_by: string | null;
  updated_at: string;
}

export interface FeedbackComment {
  id: string;
  enterprise_id: string;
  candidate_id: string;
  pipeline_stage_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateNote {
  id: string;
  enterprise_id: string;
  candidate_id: string;
  pipeline_stage_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface StageFeedbackGroup {
  stage: { id: string; name: string; position: number };
  rating: number | null;
  comments: Array<{
    id: string;
    user_id: string;
    user_name: string;
    body: string;
    created_at: string;
    updated_at: string;
    is_own: boolean;
  }>;
}
