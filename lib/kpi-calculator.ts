export const calculatePenalty = (staleDays: number, config: any) => {
  const { allowed_days, penalty_per_day, max_penalty } = config;

  if (staleDays <= allowed_days) return 0;

  const calculated = (staleDays - allowed_days) * penalty_per_day;
  return Math.min(calculated, max_penalty);
};

export const getGradeLabel = (score: number) => {
  if (score >= 100) return "100%";
  if (score >= 91) return "90%";
  if (score >= 81) return "80%";
  return "0%";
};
