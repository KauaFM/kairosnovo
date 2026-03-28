export function calculatePoints(workout, scoringType, config = {}) {
  switch (scoringType) {
    case 'workouts':
      return config.per_workout ?? 1;
    case 'minutes':
      return (workout.duration_min ?? 0) * (config.per_minute ?? 1);
    case 'calories':
      return (workout.calories ?? 0) * (config.per_calorie ?? 0.1);
    case 'steps':
      return Math.floor((workout.steps ?? 0) / 1000) * (config.per_1k_steps ?? 1);
    case 'custom':
      return config[workout.activity_type] ?? 1;
    default:
      return 1;
  }
}
