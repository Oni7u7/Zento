const db = require('../services/db');
const etherfuse = require('../services/etherfuse');

async function getOnboarding(req, res) {
  try {
    const { userId } = req.params;
    const user = db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.kycStatus === 'completed') {
      return res.json({ alreadyCompleted: true, message: 'KYC ya completado' });
    }

    const result = await etherfuse.getOnboardingUrl(userId, user.bankAccountId, user.walletAddress);
    user.kycStatus = 'pending';
    return res.json({ url: result.presignedUrl || result.url });
  } catch (err) {
    console.error('[onboarding] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getOnboarding };
