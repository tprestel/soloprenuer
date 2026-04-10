/**
 * Backgrounds module for FreshTab.
 * CSS gradient backgrounds that rotate daily. No external API dependency.
 */

const GRADIENTS = [
  'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
  'linear-gradient(135deg, #2d1b69, #6b21a8, #9333ea)',
  'linear-gradient(135deg, #134e5e, #71b280)',
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'linear-gradient(135deg, #1f1c2c, #928DAB)',
  'linear-gradient(135deg, #0B486B, #F56217)',
  'linear-gradient(135deg, #000428, #004e92)',
  'linear-gradient(135deg, #1e3c72, #2a5298)',
  'linear-gradient(135deg, #232526, #414345)',
];

/**
 * Get a gradient based on the day of the year (changes daily).
 * @returns {string} CSS gradient value
 */
export function getDailyGradient() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return GRADIENTS[dayOfYear % GRADIENTS.length];
}

/**
 * Get a random gradient.
 * @returns {string} CSS gradient value
 */
export function getRandomGradient() {
  return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
}
