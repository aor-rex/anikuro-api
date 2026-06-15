const express = require("express");
const { runTick } = require("../utils/webhookNotifier");

const router = express.Router();

router.post("/webhook-check", express.json(), async (req, res) => {
  const expected = process.env.WEBHOOK_SECRET || "";
  const provided = req.headers["x-webhook-secret"] || "";

  if (expected && provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const animeSession = String(req.body?.anime_session || "").trim() || null;
    const result = await runTick({ animeSession });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message || "check failed" });
  }
});

module.exports = router;
