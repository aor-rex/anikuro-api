const crypto = require("crypto");

// FIX Bug #48: Add request ID for correlation/tracing
const requestId = (req, res, next) => {
    const id = crypto.randomBytes(8).toString("hex");
    req.id = id;
    res.setHeader("X-Request-ID", id);
    next();
};

module.exports = requestId;
