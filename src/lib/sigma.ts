// SIGMA Ranking Algorithm - EXACT Implementation from SIGMA_Algorithm_COMPLETE.txt
// Scaled Impact & Growth Metric Algorithm
// Bayesian-IRT-Elo Hybrid

export interface TaskVariables {
  F: number       // Failure Rate [0, 1]
  R: number       // Risk Level [1, 5]
  r: number       // Rarity (0, 1]
  I: number       // Impact Score [1, 10]
  V: number       // Verification Status: 0=verified, 0.3=partial, 0.8=unverified
  n: number       // Repeat Count
  T?: number      // Time Required (hours)
  category?: string  // Task category for entropy calculation
}

export interface UserState {
  theta: number           // Latent capability O
  sigma: number           // Uncertainty s^2
  n_tasks: number         // Total tasks completed
  streak_days: number     // Consecutive days
  theta_peak: number      // All-time peak O_peak
  last_task_date: string // ISO date
  category_distribution: Record<string, number>  // For entropy H(u)
  recent_difficulties: number[]  // Last 30 D(t) values
  tasks_today: number    // Tasks completed today
}

export interface SigmaResult {
  sigma_score: number     // Display score [0, 1000]
  theta: number           // Raw theta
  tier: string            // Tier name
  tier_sub: string        // Bronze/Silver/Gold
  percentile: number     // Top X%
  confidence_interval: [number, number]
  ceiling: number
}

// MASTER PARAMETERS (from Algorithm Reference)
const P = {
  b1: 2.1, b2: 1.8, b3: 1.5, b4: 1.2, b5: 3.0,  // Difficulty weights
  y: 1.4,           // Impact super-linearity exponent
  lambda: 0.35,     // Repeat decay steepness
  eta: 0.08,       // Bayesian learning rate
  kappa: 0.15,     // Confidence tightening factor
  K_max: 32,        // Max Elo K-factor
  alpha_K: 0.05,   // K-factor dampening (theta)
  beta_K: 0.80,    // K-factor dampening (n)
  w1: 0.50,        // Bayesian weight
  w2: 0.30,        // Elo weight
  w3: 0.15,        // Consistency weight
  w4: 0.05,        // Decay weight
  delta: 0.05,     // Streak growth rate
  psi: 0.003,       // Inactivity decay constant (half-life 231 days)
  z_threshold: 3.0, // Velocity cap trigger
  a_scale: 1.20,   // Final score steepness
  O_midpoint: 2.50, // Theta mapping to score 500
  C_max: 0.50,     // Max consistency bonus
  epsilon: 0.10,    // CV smoothing
  theta_floor_ratio: 0.30, // Floor = 30% of peak
  N_categories: 20,
  D_max: 90,        // Practical max D(t)
  alpha_T: 0.15,    // Time weight
  T_ref: 10,        // Reference time (hours)
  a_default: 1.5,    // IRT discrimination
  c_default: 0.10,  // IRT guessing floor
}

// Global statistics (would come from DB in production)
let GLOBAL = {
  mu_D: 40,         // Mean D(t)
  sigma_D: 15,      // Std D(t)
  mu_pop: 3,        // Mean tasks per day
  sigma_pop: 2,      // Std tasks per day
  mu_theta: 1.0,    // Population mean theta
  sigma_theta: 1.0, // Population std theta
}

export function updateGlobalStats(stats: Partial<typeof GLOBAL>) {
  GLOBAL = { ...GLOBAL, ...stats }
}

// ============================================================================
// EQUATION 1: TASK DIFFICULTY SCORE D(t)
// D(t) = b1*ln(1+F) + b2*R^2 + b3*ln(1+1/r) + b4*I^y + b5*(1 - V_penalty)
// ============================================================================
export function computeDifficulty(task: TaskVariables): number {
  const { F, R, r, I, V, T } = task
  const r_capped = Math.max(r, 0.001)  // Prevent division by zero
  
  let D = P.b1 * Math.log(1 + F)
       + P.b2 * R * R
       + P.b3 * Math.log(1 + 1 / r_capped)
       + P.b4 * Math.pow(I, P.y)
       + P.b5 * (1 - V)
  
  // EQUATION 3 (Time-Adjusted Difficulty): D_time(t) = D * (1 + alpha_T * ln(1 + T/T_ref))
  if (T && T > 0) {
    D = D * (1 + P.alpha_T * Math.log(1 + T / P.T_ref))
  }
  
  return D
}

// ============================================================================
// EQUATION 2: REPEAT DECAY V_effective(n)
// V_effective(n) = D(t) * exp(-lambda * (n-1)^2)
// ============================================================================
export function computeRepeatDecay(D: number, n: number): number {
  return D * Math.exp(-P.lambda * Math.pow(n - 1, 2))
}

// ============================================================================
// EQUATION 4: IRT PROBABILITY OF SUCCESS
// P(success | theta, a, b, c) = c + (1-c) * [1 / (1 + exp(-a*(theta-b))]
// ============================================================================
export function computeSuccessProbability(theta: number, b_norm: number, a = P.a_default, c = P.c_default): number {
  return c + (1 - c) * (1 / (1 + Math.exp(-a * (theta - b_norm))))
}

// ============================================================================
// EQUATION 5: BAYESIAN CAPABILITY UPDATE
// mu_new = mu_old + eta * (x - P) * b_norm
// s^2_new = s^2 * (1 - kappa * P * (1-P))
// ============================================================================
export function computeBayesianUpdate(
  theta: number, sigma: number, b_norm: number, outcome: number, P_success: number
): { theta: number; sigma: number } {
  const delta_theta = P.eta * (outcome - P_success) * b_norm
  const new_theta = Math.max(-3, Math.min(8, theta + delta_theta))
  const new_sigma_sq = sigma * sigma * (1 - P.kappa * P_success * (1 - P_success))
  const new_sigma = Math.max(0.1, Math.min(2.0, Math.sqrt(new_sigma_sq)))
  
  return { theta: new_theta, sigma: new_sigma }
}

// ============================================================================
// EQUATION 6: ELO COMPARATIVE UPDATE
// E_A = 1 / (1 + 10^((theta_peer - theta_A) / 400))
// Delta_O_A = K * D_norm * (S_A - E_A)
// ============================================================================
export function computeEloUpdate(
  theta: number, theta_peer: number, K: number, D: number, outcome: number
): number {
  const E = 1 / (1 + Math.pow(10, (theta_peer - theta) / 400))
  const D_norm = D / P.D_max  // Normalize D to [0, 1]
  return K * D_norm * (outcome - E)
}

// ============================================================================
// EQUATION 7: DYNAMIC K-FACTOR
// K(theta, n) = K_max / (1 + alpha_K * theta + beta_K * ln(1+n))
// ============================================================================
export function computeKFactor(theta: number, n: number): number {
  const K = P.K_max / (1 + P.alpha_K * theta + P.beta_K * Math.log(1 + n))
  return Math.max(1.0, K)  // Lower bound of 1.0
}

// ============================================================================
// EQUATION 8: CONSISTENCY BONUS C(u)
// C(u) = C_max * (1 - exp(-delta * streak)) * (CV + epsilon)^(-1)
// ============================================================================
export function computeConsistencyBonus(streak_days: number, CV: number): number {
  const streak_term = 1 - Math.exp(-P.delta * streak_days)
  const cv_term = 1 / (CV + P.epsilon)
  return Math.min(P.C_max, P.C_max * streak_term * cv_term)
}

// ============================================================================
// EQUATION 9: INACTIVITY DECAY Psi(t)
// theta(t) = theta_floor + (theta_current - theta_floor) * exp(-psi * Delta_t)
// ============================================================================
export function computeInactivityDecay(theta: number, theta_peak: number, days_inactive: number): number {
  const theta_floor = P.theta_floor_ratio * theta_peak
  return theta_floor + (theta - theta_floor) * Math.exp(-P.psi * days_inactive)
}

// ============================================================================
// EQUATION 10: ANTI-GAMING VELOCITY CAP
// z = (tasks_today - pop_mean) / pop_std
// penalty = 1 / (1 + exp(z - z_threshold))
// ============================================================================
export function computeVelocityPenalty(tasks_today: number): number {
  const z = (tasks_today - GLOBAL.mu_pop) / GLOBAL.sigma_pop
  return 1 / (1 + Math.exp(z - P.z_threshold))
}

// ============================================================================
// EQUATION 11: ENTROPY DIVERSITY CHECK
// H(u) = -sum(p_i * log2(p_i))
// diversity_multiplier = min(1.0, H(u) / log2(N_categories))
// ============================================================================
export function computeDiversityMultiplier(category_dist: Record<string, number>): number {
  const total = Object.values(category_dist).reduce((sum, c) => sum + c, 0)
  if (total === 0) return 1.0
  
  let H = 0
  for (const count of Object.values(category_dist)) {
    const p = count / total
    if (p > 0) H -= p * Math.log2(p)
  }
  
  const H_max = Math.log2(P.N_categories)
  return Math.min(1.0, H / H_max)
}

// ============================================================================
// EQUATION 17: FINAL SIGMA SCORE
// SIGMA = 1000 * [1 / (1 + exp(-a_scale * (theta - O_midpoint)))]
// ============================================================================
export function computeSigmaScore(theta: number): number {
  const exp_arg = -P.a_scale * (theta - P.O_midpoint)
  return Math.round(1000 * (1 / (1 + Math.exp(exp_arg))))
}

// ============================================================================
// EQUATION 18: TIER ASSIGNMENT (percentile-anchored)
// ============================================================================
export function getTier(score: number): { tier: string; sub: string; percentile: number } {
  if (score < 200) return { tier: 'Novice', sub: 'Bronze', percentile: 95 }
  if (score < 300) return { tier: 'Novice', sub: 'Silver', percentile: 85 }
  if (score < 400) return { tier: 'Skilled', sub: 'Bronze', percentile: 75 }
  if (score < 500) return { tier: 'Skilled', sub: 'Silver', percentile: 65 }
  if (score < 600) return { tier: 'Skilled', sub: 'Gold', percentile: 55 }
  if (score < 700) return { tier: 'Expert', sub: 'Bronze', percentile: 40 }
  if (score < 800) return { tier: 'Expert', sub: 'Silver', percentile: 25 }
  if (score < 850) return { tier: 'Elite', sub: 'Bronze', percentile: 12 }
  if (score < 900) return { tier: 'Elite', sub: 'Silver', percentile: 6 }
  if (score < 950) return { tier: 'Master', sub: 'Bronze', percentile: 3 }
  return { tier: 'Apex', sub: 'Gold', percentile: 1 }
}

// ============================================================================
// EQUATION 19: CONFIDENCE INTERVAL
// ============================================================================
export function computeConfidenceInterval(theta: number, sigma: number): [number, number] {
  const lower = computeSigmaScore(theta - 1.96 * sigma)
  const upper = computeSigmaScore(theta + 1.96 * sigma)
  return [lower, upper]
}

// ============================================================================
// EQUATION 20: CAPABILITY CEILING
// theta_ceiling = theta + sigma * Z_99
// ============================================================================
export function computeCeiling(theta: number, sigma: number): number {
  const theta_ceiling = theta + sigma * 2.326
  return computeSigmaScore(theta_ceiling)
}

// ============================================================================
// MAIN FUNCTION: PROCESS TASK COMPLETION
// ============================================================================
export function processTaskCompletion(
  user: UserState,
  task: TaskVariables,
  outcome: number,  // 1 = success, 0 = failure
  theta_peer = GLOBAL.mu_theta  // Default to population mean
): SigmaResult {
  // Step 1: Raw difficulty D(t)
  const D = computeDifficulty(task)
  
  // Step 2: Repeat decay V_effective
  const V_eff = computeRepeatDecay(D, task.n)
  
  // Step 3: Normalize to logit scale b = (D - mu_D) / sigma_D
  const b_norm = (D - GLOBAL.mu_D) / GLOBAL.sigma_D
  
  // Step 4: IRT P(success)
  const P_success = computeSuccessProbability(user.theta, b_norm)
  
  // Step 5: Bayesian update
  const { theta: theta_new, sigma: sigma_new } = computeBayesianUpdate(
    user.theta, user.sigma, b_norm, outcome, P_success
  )
  
  // Step 6: Elo update (only applied if successful)
  const K = computeKFactor(user.theta, user.n_tasks)
  let delta_elo = 0
  if (outcome === 1) {
    delta_elo = computeEloUpdate(user.theta, theta_peer, K, D, outcome)
  }
  
  // Step 7: Anti-gaming
  const velocity_penalty = computeVelocityPenalty(user.tasks_today + 1)
  const diversity_multi = computeDiversityMultiplier(user.category_distribution)
  
  // Apply anti-gaming to Elo
  const effective_elo = delta_elo * velocity_penalty * diversity_multi
  
  // Step 8: Consistency bonus (only if successful)
  let C = 0
  if (outcome === 1) {
    const recent_Ds = [...user.recent_difficulties, D].slice(-30)
    const mean_D = recent_Ds.reduce((a, b) => a + b, 0) / recent_Ds.length
    const std_D = Math.sqrt(recent_Ds.reduce((sum, d) => sum + Math.pow(d - mean_D, 2), 0) / recent_Ds.length)
    const CV = std_D / mean_D
    C = computeConsistencyBonus(user.streak_days + 1, CV)
  }
  
  // Step 9: Combined update
  // theta_new = theta_old + w1*Delta_Bayes + w2*Delta_Elo + w3*C - w4*Psi
  let theta_final = user.theta
    + P.w1 * (theta_new - user.theta)  // Full Bayesian delta
    + P.w2 * effective_elo
    + P.w3 * C
  
  // Step 10: Inactivity decay (if inactive > 7 days)
  if (user.last_task_date) {
    const days_inactive = Math.floor((Date.now() - new Date(user.last_task_date).getTime()) / (1000 * 60 * 60 * 24))
    if (days_inactive > 7) {
      const decayed = computeInactivityDecay(theta_final, user.theta_peak, days_inactive)
      theta_final = theta_final - P.w4 * (theta_final - decayed)  // w4 is applied as decay
    }
  }
  
  // Bound theta
  theta_final = Math.max(-3, Math.min(8, theta_final))
  
  // Update peak
  const theta_peak = Math.max(user.theta_peak, theta_final)
  
  // Calculate final score
  const sigma_score = computeSigmaScore(theta_final)
  const tier_info = getTier(sigma_score)
  const ci = computeConfidenceInterval(theta_final, sigma_new)
  const ceiling = computeCeiling(theta_final, sigma_new)
  
  return {
    sigma_score,
    theta: theta_final,
    tier: tier_info.tier,
    tier_sub: tier_info.sub,
    percentile: tier_info.percentile,
    confidence_interval: ci,
    ceiling
  }
}

// ============================================================================
// INITIALIZE USER STATE
// ============================================================================
export function createInitialUser(): UserState {
  return {
    theta: 0,
    sigma: 1.5,  // High initial uncertainty
    n_tasks: 0,
    streak_days: 0,
    theta_peak: 0,
    last_task_date: null as any,
    category_distribution: {},
    recent_difficulties: [],
    tasks_today: 0
  }
}

// ============================================================================
// GUEST PLACEHOLDER (for leaderboard without real data)
// ============================================================================
export function computeGuestPlace(baseTheta: number, place: number): UserState {
  return {
    theta: Math.max(0.5, baseTheta - place * 0.01),
    sigma: 1.0,
    n_tasks: Math.max(1, 100 - place),
    streak_days: Math.max(0, 30 - place),
    theta_peak: Math.max(0.5, baseTheta - place * 0.01),
    last_task_date: new Date().toISOString(),
    category_distribution: {},
    recent_difficulties: [],
    tasks_today: 3
  }
}

export default {
  computeDifficulty,
  computeRepeatDecay,
  computeSuccessProbability,
  computeBayesianUpdate,
  computeEloUpdate,
  computeKFactor,
  computeConsistencyBonus,
  computeInactivityDecay,
  computeVelocityPenalty,
  computeDiversityMultiplier,
  computeSigmaScore,
  getTier,
  processTaskCompletion,
  createInitialUser,
  computeGuestPlace,
  updateGlobalStats
}